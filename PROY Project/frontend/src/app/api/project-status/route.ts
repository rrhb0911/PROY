import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Project } from '@/lib/types'

interface TaskInput {
  title: string
  status?: 'pending' | 'in_progress' | 'done' | 'blocked'
}

interface ProjectStatusPayload {
  slug: string
  name?: string
  status?: Project['status']
  progress?: number
  notes?: string
  url_repo?: string
  url_deploy?: string
  tasks?: TaskInput[]
}

export async function POST(request: Request) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token || token !== process.env.PROJECT_STATUS_API_TOKEN) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const body: ProjectStatusPayload = await request.json()
  const { slug, name, status, progress, notes, url_repo, url_deploy, tasks } = body

  if (!slug) {
    return NextResponse.json({ error: 'slug es requerido' }, { status: 400 })
  }

  const supabase = createAdminClient()

  const { data: existing } = await supabase
    .from('projects')
    .select('id')
    .eq('slug', slug)
    .maybeSingle()

  if (!existing && !name) {
    return NextResponse.json(
      { error: 'name es requerido para crear el proyecto' },
      { status: 400 }
    )
  }

  const upsertData: Partial<Project> & { slug: string } = { slug }
  if (name !== undefined) upsertData.name = name
  if (status !== undefined) upsertData.status = status
  if (progress !== undefined) upsertData.progress = progress
  if (notes !== undefined) upsertData.notes = notes
  if (url_repo !== undefined) upsertData.url_repo = url_repo
  if (url_deploy !== undefined) upsertData.url_deploy = url_deploy

  const { data: project, error } = await supabase
    .from('projects')
    .upsert(upsertData, { onConflict: 'slug' })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (tasks) {
    const { error: deleteError } = await supabase
      .from('project_tasks')
      .delete()
      .eq('project_id', project.id)

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    if (tasks.length > 0) {
      const { error: insertError } = await supabase.from('project_tasks').insert(
        tasks.map((t) => ({
          project_id: project.id,
          title: t.title,
          status: t.status ?? 'pending',
          completed_at: t.status === 'done' ? new Date().toISOString() : null,
        }))
      )

      if (insertError) {
        return NextResponse.json({ error: insertError.message }, { status: 500 })
      }
    }
  }

  return NextResponse.json({ ok: true, project })
}
