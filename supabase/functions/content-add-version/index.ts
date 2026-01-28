// supabase/functions/content-add-version/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { multiParser, FormFile } from 'https://deno.land/x/multiparser@0.114.0/mod.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
}

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const MAX_FILE_SIZE = 100 * 1024 * 1024 // 100MB

const ALLOWED_MIMES = [
  'application/pdf',
  'application/epub+zip',
  'application/x-mobipocket-ebook',
  'application/vnd.amazon.ebook',
  'application/msword',
  'application/vnd.ms-excel',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.oasis.opendocument.text',
  'application/vnd.oasis.opendocument.spreadsheet',
  'application/vnd.oasis.opendocument.presentation',
  'text/plain',
  'text/markdown',
  'text/csv',
  'text/html',
  'application/xhtml+xml',
  'application/zip',
  'image/jpeg',
  'image/png',
  'image/webp',
]

const validExtensions = [
  'pdf', 'epub', 'mobi', 'azw', 'azw3', 'doc', 'docx', 'xls', 'xlsx',
  'ppt', 'pptx', 'odt', 'ods', 'odp', 'txt', 'md', 'markdown', 'csv',
  'html', 'htm', 'xhtml', 'zip', 'jpg', 'jpeg', 'png', 'webp'
]

const formatMap: Record<string, string> = {
  'pdf': 'pdf', 'doc': 'doc', 'docx': 'docx', 'txt': 'txt',
  'md': 'markdown', 'markdown': 'markdown', 'xls': 'xls', 'xlsx': 'xlsx',
  'csv': 'csv', 'ods': 'ods', 'ppt': 'ppt', 'pptx': 'pptx', 'odp': 'odp',
  'epub': 'epub', 'mobi': 'mobi', 'azw': 'azw', 'azw3': 'azw3',
  'html': 'html', 'htm': 'html', 'xhtml': 'xhtml', 'odt': 'odt',
  'zip': 'zip', 'jpg': 'jpg', 'jpeg': 'jpeg', 'png': 'png', 'webp': 'webp',
}

const mimeMap: Record<string, string> = {
  pdf: 'application/pdf',
  epub: 'application/epub+zip',
  mobi: 'application/x-mobipocket-ebook',
  azw: 'application/vnd.amazon.ebook',
  azw3: 'application/vnd.amazon.ebook',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  odt: 'application/vnd.oasis.opendocument.text',
  ods: 'application/vnd.oasis.opendocument.spreadsheet',
  odp: 'application/vnd.oasis.opendocument.presentation',
  txt: 'text/plain',
  md: 'text/markdown',
  markdown: 'text/markdown',
  csv: 'text/csv',
  html: 'text/html',
  htm: 'text/html',
  xhtml: 'application/xhtml+xml',
  zip: 'application/zip',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
}

const getFormatFromFilename = (filename: string): string => {
  const ext = filename.split('.').pop()?.toLowerCase() || ''
  return formatMap[ext] || ext || 'unknown'
}

const getStorageBucket = (contentType: string, mimeType: string): string => {
  if (['book', 'ebook'].includes(contentType.toLowerCase())) return 'book-files'
  if (mimeType.startsWith('image/')) return 'manuscripts'
  if (contentType.toLowerCase().includes('manuscript')) return 'manuscripts'
  return 'documets'
}

// Helper to get a single FormFile from possibly array
const getSingleFile = (file: FormFile | FormFile[] | undefined): FormFile | undefined => {
  if (!file) return undefined
  return Array.isArray(file) ? file[0] : file
}

Deno.serve(async (req): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { 
      status: 200,
      headers: corsHeaders 
    })
  }

  try {
    console.log('=== CONTENT ADD VERSION FUNCTION START ===')
    
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Authenticate user
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const token = authHeader.replace('Bearer ', '')
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log('User authenticated:', user.id)

    // Parse multipart form
    let form
    try {
      form = await multiParser(req)
    } catch (e: unknown) {
      const parseErr = e as Error
      console.error('Parse error:', parseErr.message)
      return new Response(JSON.stringify({ 
        error: 'Failed to parse form', 
        details: parseErr.message 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!form?.files || !form?.fields) {
      return new Response(JSON.stringify({ error: 'Invalid form data' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const newFile = getSingleFile(form.files.new_file)
    const f = form.fields

    const content_id = (f.content_id as string)?.trim()
    const version_number = (f.version_number as string)?.trim()
    const change_summary = (f.change_summary as string)?.trim() || 'File updated'

    if (!content_id) {
      return new Response(JSON.stringify({ error: 'content_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (!newFile) {
      return new Response(JSON.stringify({ error: 'new_file is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log('Adding version to content:', content_id)

    // Fetch existing content
    const { data: content, error: fetchError } = await supabaseAdmin
      .from('content')
      .select('*')
      .eq('id', content_id)
      .single()

    if (fetchError || !content) {
      return new Response(JSON.stringify({ error: 'Content not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log('Content found:', content.title)

    // Verify permissions
    let hasPermission = content.uploaded_by === user.id

    if (!hasPermission && content.organization_id) {
      const { data: orgMember } = await supabaseAdmin
        .from('organization_members')
        .select('role')
        .eq('organization_id', content.organization_id)
        .eq('user_id', user.id)
        .single()

      if (orgMember && ['admin', 'moderator'].includes(orgMember.role)) {
        hasPermission = true
      }
    }

    if (!hasPermission) {
      return new Response(JSON.stringify({ error: 'Insufficient permissions' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log('Permission granted')

    // Validate new file
    const fileExt = newFile.filename.split('.').pop()?.toLowerCase() || ''
    const fileMimeType = (newFile as any).contentType || (newFile as any).type || ''
    const isValidMime = fileMimeType && ALLOWED_MIMES.includes(fileMimeType)
    const isValidExt = validExtensions.includes(fileExt)

    if (!isValidMime && !isValidExt) {
      return new Response(JSON.stringify({
        error: 'Invalid file type',
        received_type: fileMimeType || 'undefined',
        received_extension: fileExt,
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const fileSize = newFile.content.length
    if (fileSize > MAX_FILE_SIZE) {
      return new Response(JSON.stringify({
        error: 'File too large',
        size: `${(fileSize / 1024 / 1024).toFixed(2)}MB`,
        limit: '100MB'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Calculate next version number
    let nextVersion = version_number
    if (!nextVersion) {
      const currentVersion = parseFloat(content.version || '1.0')
      nextVersion = (currentVersion + 0.1).toFixed(1)
    }

    console.log('New version:', nextVersion)

    // Upload new file
    const format = getFormatFromFilename(newFile.filename)
    const storageBucket = getStorageBucket(content.content_type, fileMimeType)

    let effectiveMime = fileMimeType
    if (!effectiveMime || !ALLOWED_MIMES.includes(effectiveMime)) {
      effectiveMime = mimeMap[fileExt] || 'application/octet-stream'
    }

    const ext = fileExt || format
    const filePath = `${user.id}/${crypto.randomUUID()}.${ext}`

    console.log('Uploading to bucket:', storageBucket)

    const { error: uploadErr } = await supabaseAdmin.storage
      .from(storageBucket)
      .upload(filePath, newFile.content, {
        contentType: effectiveMime,
        upsert: false,
      })

    if (uploadErr) {
      console.error('Upload error:', uploadErr)
      return new Response(JSON.stringify({
        error: 'Upload failed',
        details: uploadErr.message,
        bucket: storageBucket
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Generate signed URL for private buckets
    const { data: signedUrlData, error: signedUrlError } = await supabaseAdmin.storage
      .from(storageBucket)
      .createSignedUrl(filePath, 60 * 60 * 24 * 365 * 60) // 60 years

    let new_file_url: string
    if (signedUrlError) {
      console.warn('Signed URL failed, falling back to public URL:', signedUrlError.message)
      const { data: { publicUrl } } = supabaseAdmin.storage
        .from(storageBucket)
        .getPublicUrl(filePath)
      new_file_url = publicUrl
    } else {
      new_file_url = signedUrlData.signedUrl
    }

    console.log('New file uploaded:', new_file_url)

    // Save current version to history
    if (content.file_url) {
      try {
        const { error: historyError } = await supabaseAdmin
          .from('content_version_history')
          .insert({
            content_id: content_id,
            version_number: content.version || '1.0',
            file_url: content.file_url,
            file_size_bytes: content.file_size_bytes,
            format: content.format,
            change_summary: `Replaced by version ${nextVersion}`,
            changed_by: user.id,
          })

        if (historyError) {
          console.warn('Failed to save version history:', historyError.message)
        } else {
          console.log('Previous version saved to history')
        }
      } catch (err) {
        console.warn('Version history error:', err)
      }
    }

    // Update content with new version
    const { data: updatedContent, error: updateError } = await supabaseAdmin
      .from('content')
      .update({
        version: nextVersion,
        file_url: new_file_url,
        file_size_bytes: fileSize,
        format: format,
        updated_at: new Date().toISOString(),
      })
      .eq('id', content_id)
      .select()
      .single()

    if (updateError) {
      console.error('Update error:', updateError)
      return new Response(JSON.stringify({
        error: 'Failed to update content',
        details: updateError.message
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Add new version to history
    const { error: newHistoryError } = await supabaseAdmin
      .from('content_version_history')
      .insert({
        content_id: content_id,
        version_number: nextVersion,
        file_url: new_file_url,
        file_size_bytes: fileSize,
        format: format,
        change_summary: change_summary,
        changed_by: user.id,
      })

    if (newHistoryError) {
      console.warn('Failed to add new version to history:', newHistoryError.message)
    }

    // Fetch version history
    const { data: versionHistory } = await supabaseAdmin
      .rpc('get_content_version_history', { p_content_id: content_id })

    console.log('Version added successfully')

    return new Response(
      JSON.stringify({
        message: 'Version added successfully',
        content: updatedContent,
        version_history: versionHistory || [],
        metadata: {
          previous_version: content.version,
          new_version: nextVersion,
          file_size: `${(fileSize / 1024 / 1024).toFixed(2)}MB`,
          format: format,
          bucket: storageBucket,
        }
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )

  } catch (error: unknown) {
    const err = error as Error
    console.error('=== UNEXPECTED ERROR ===')
    console.error('Type:', err.constructor?.name || 'Unknown')
    console.error('Message:', err.message || 'No message')
    console.error('Stack:', err.stack || 'No stack')

    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: err.message || 'Unknown error',
        type: err.constructor?.name || 'Error'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
