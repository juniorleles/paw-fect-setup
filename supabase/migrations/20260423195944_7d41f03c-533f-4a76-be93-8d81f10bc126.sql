-- Tabela para registrar solicitações de exclusão de dados da Meta
CREATE TABLE public.meta_data_deletion_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  confirmation_code TEXT NOT NULL UNIQUE,
  meta_user_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'received',
  requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_meta_deletion_meta_user_id ON public.meta_data_deletion_requests(meta_user_id);
CREATE INDEX idx_meta_deletion_status ON public.meta_data_deletion_requests(status);

ALTER TABLE public.meta_data_deletion_requests ENABLE ROW LEVEL SECURITY;

-- Admins podem visualizar todas as solicitações
CREATE POLICY "Admins can view deletion requests"
  ON public.meta_data_deletion_requests
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins podem atualizar status
CREATE POLICY "Admins can update deletion requests"
  ON public.meta_data_deletion_requests
  FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Service role pode inserir e atualizar
CREATE POLICY "Service can insert deletion requests"
  ON public.meta_data_deletion_requests
  FOR INSERT
  TO public
  WITH CHECK (current_setting('role'::text, true) = 'service_role'::text);

CREATE POLICY "Service can update deletion requests"
  ON public.meta_data_deletion_requests
  FOR UPDATE
  TO public
  USING (current_setting('role'::text, true) = 'service_role'::text);

-- Trigger updated_at
CREATE TRIGGER update_meta_deletion_updated_at
  BEFORE UPDATE ON public.meta_data_deletion_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();