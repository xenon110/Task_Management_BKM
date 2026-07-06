-- 1. Helper function to calculate duration exactly like the frontend (e.g. "8 hrs 30 mins")
CREATE OR REPLACE FUNCTION format_duration(ms double precision) 
RETURNS text AS $$
DECLARE
    total_minutes int;
    hours int;
    mins int;
    result text;
BEGIN
    IF ms < 0 THEN
        ms := 0;
    END IF;
    
    total_minutes := floor(ms / 60000);
    hours := floor(total_minutes / 60);
    mins := total_minutes % 60;
    
    IF hours > 0 THEN
        result := hours || ' hr';
        IF hours > 1 THEN
            result := result || 's';
        END IF;
        
        -- append minutes part
        IF mins > 0 THEN
            result := result || ' ' || mins || ' min';
            IF mins > 1 THEN
                result := result || 's';
            END IF;
        ELSE
            result := result || ' 0 mins';
        END IF;
    ELSE
        result := mins || ' min';
        IF mins > 1 THEN
            result := result || 's';
        END IF;
    END IF;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 2. The main function to process missing logouts
CREATE OR REPLACE FUNCTION process_auto_checkout() 
RETURNS void AS $$
DECLARE
    rec RECORD;
    login_ms double precision;
    logout_ms double precision;
    lunch_out_ms double precision;
    lunch_in_ms double precision;
    total_ms double precision;
    formatted_duration text;
    target_logout_time timestamp with time zone;
BEGIN
    -- Find all attendance records from previous days that don't have a logout_time
    FOR rec IN 
        SELECT * FROM attendance 
        WHERE logout_time IS NULL AND date < current_date::text
    LOOP
        -- Target checkout is 19:00:00 (7 PM) on the day of the attendance
        target_logout_time := (rec.date || ' 19:00:00')::timestamp with time zone;
        
        -- Convert timestamps to epoch milliseconds for calculation
        login_ms := EXTRACT(EPOCH FROM rec.login_time::timestamp with time zone) * 1000;
        logout_ms := EXTRACT(EPOCH FROM target_logout_time) * 1000;
        
        total_ms := logout_ms - login_ms;
        IF total_ms < 0 THEN
            total_ms := 0;
        END IF;
        
        -- Adjust for lunch breaks
        IF rec.lunch_out_time IS NOT NULL AND rec.lunch_in_time IS NOT NULL THEN
            lunch_out_ms := EXTRACT(EPOCH FROM rec.lunch_out_time::timestamp with time zone) * 1000;
            lunch_in_ms := EXTRACT(EPOCH FROM rec.lunch_in_time::timestamp with time zone) * 1000;
            total_ms := total_ms - (lunch_in_ms - lunch_out_ms);
        ELSIF rec.lunch_out_time IS NOT NULL AND rec.lunch_in_time IS NULL THEN
            -- Deduct 1 hour if they went to lunch but forgot to clock back in
            total_ms := total_ms - 3600000;
        END IF;
        
        -- Format the duration
        formatted_duration := format_duration(total_ms);
        
        -- Update the record
        UPDATE attendance 
        SET 
            logout_time = target_logout_time,
            total_working_hours = formatted_duration,
            leave_remark = 'Auto-checkout (Forgot to logout)'
        WHERE id = rec.id;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 3. Enable the pg_cron extension (built into Supabase)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 4. Schedule the job to run every hour. 
-- It will safely check for any open records from *previous* days and close them.
SELECT cron.schedule(
    'hourly-auto-checkout',
    '0 * * * *', 
    $$ SELECT process_auto_checkout(); $$
);
