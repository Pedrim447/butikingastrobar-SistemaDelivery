-- Remover policies antigas que serão substituídas
DROP POLICY IF EXISTS "Admins can insert roles" ON user_roles;
DROP POLICY IF EXISTS "Users can view their own roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can update roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can insert riders" ON user_roles;
DROP POLICY IF EXISTS "Admins can update riders" ON delivery_riders;

-- Permitir que usuários criem sua própria role 'user' na inscrição
CREATE POLICY "Users can insert their own user role" 
ON user_roles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id AND role = 'user');

-- Permitir que usuários vejam suas próprias roles
CREATE POLICY "Users can view their own roles" 
ON user_roles 
FOR SELECT 
USING (auth.uid() = user_id);

-- Admins podem ver todas as roles
CREATE POLICY "Admins can view all roles" 
ON user_roles 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'));

-- Admins podem inserir qualquer role
CREATE POLICY "Admins can insert any role" 
ON user_roles 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Admins podem atualizar roles
CREATE POLICY "Admins can update roles" 
ON user_roles 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'));

-- Ajustar delivery_riders para que admins possam gerenciar
CREATE POLICY "Admins can manage riders" 
ON delivery_riders 
FOR ALL
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));