CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS public.devices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    device_code VARCHAR UNIQUE NOT NULL,
    device_name VARCHAR NOT NULL,
    public_key TEXT NOT NULL,
    status VARCHAR DEFAULT 'PENDING',
    assigned_employee_id UUID REFERENCES public.users(id),
    mac_address VARCHAR,
    registered_at TIMESTAMPTZ DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ,
    created_by UUID REFERENCES public.users(id)
);

CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID REFERENCES public.users(id),
    device_id UUID REFERENCES public.devices(id),
    action VARCHAR NOT NULL,
    result VARCHAR NOT NULL,
    reason VARCHAR,
    ip_address VARCHAR,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB
);

-- Add device binding columns to users and attendance tables
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS assigned_device_id UUID REFERENCES public.devices(id);
ALTER TABLE public.attendance ADD COLUMN IF NOT EXISTS login_device_id UUID REFERENCES public.devices(id);
ALTER TABLE public.attendance ADD COLUMN IF NOT EXISTS logout_device_id UUID REFERENCES public.devices(id);

-- Enforce RLS for devices
ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage devices" ON public.devices
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid() AND users.role IN ('admin', 'owner', 'developer')
        )
    );

CREATE POLICY "Users can view their assigned device" ON public.devices
    FOR SELECT
    USING (assigned_employee_id = auth.uid());

-- Enforce RLS for audit_logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view audit logs" ON public.audit_logs
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid() AND users.role IN ('admin', 'owner', 'developer')
        )
    );
