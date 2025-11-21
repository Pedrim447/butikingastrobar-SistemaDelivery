import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { email, password, name, phone } = await req.json()

    console.log('Creating delivery rider:', { email, name, phone })

    // Create admin client with service role
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Verify caller is admin
    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)
    
    if (userError || !user) {
      console.error('Unauthorized access attempt')
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if user is admin
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (roleError || roleData?.role !== 'admin') {
      console.error('Non-admin user tried to create delivery rider')
      return new Response(
        JSON.stringify({ error: 'Acesso negado - Apenas administradores' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if email already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers()
    const emailExists = existingUsers?.users.some(u => u.email === email)
    
    if (emailExists) {
      console.log('Email already exists:', email)
      return new Response(
        JSON.stringify({ error: 'Este email já está cadastrado no sistema' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create the delivery rider user
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (createError) {
      console.error('Error creating user:', createError)
      throw new Error('Erro ao criar usuário: ' + createError.message)
    }

    if (!newUser.user) {
      throw new Error('Falha ao criar usuário')
    }

    console.log('User created successfully:', newUser.user.id)

    // Create delivery rider profile
    const { error: riderError } = await supabaseAdmin
      .from('delivery_riders')
      .insert({
        user_id: newUser.user.id,
        name,
        phone,
      })

    if (riderError) {
      console.error('Error creating rider profile:', riderError)
      throw new Error('Erro ao criar perfil do entregador: ' + riderError.message)
    }

    console.log('Rider profile created successfully')

    // Add delivery_rider role
    const { error: roleInsertError } = await supabaseAdmin
      .from('user_roles')
      .insert({
        user_id: newUser.user.id,
        role: 'delivery_rider',
      })

    if (roleInsertError) {
      console.error('Error adding role:', roleInsertError)
      throw new Error('Erro ao adicionar permissão: ' + roleInsertError.message)
    }

    console.log('Delivery rider created successfully:', newUser.user.id)

    return new Response(
      JSON.stringify({ success: true, user: newUser.user }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error in create-delivery-rider function:', error)
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
