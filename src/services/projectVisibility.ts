import { supabase } from '@/services/supabase';

export interface ProjectTableVisibilityRow {
  id?: string;
  project_id: string;
  collection_name: string;
  visible: boolean;
}

export async function fetchProjectTableVisibilitySupabase(
  projectId: string | number,
): Promise<ProjectTableVisibilityRow[]> {
  const { data, error } = await supabase
    .from('project_table_visibility')
    .select('id, project_id, collection_name, visible')
    .eq('project_id', String(projectId));
  if (error) return [];
  return (data ?? []).map((r) => ({
    id: r.id as string,
    project_id: r.project_id as string,
    collection_name: r.collection_name as string,
    visible: r.visible as boolean,
  }));
}

export async function fetchAllProjectTableVisibilitySupabase(): Promise<ProjectTableVisibilityRow[]> {
  const { data, error } = await supabase
    .from('project_table_visibility')
    .select('id, project_id, collection_name, visible');
  if (error) return [];
  return (data ?? []).map((r) => ({
    id: r.id as string,
    project_id: r.project_id as string,
    collection_name: r.collection_name as string,
    visible: r.visible as boolean,
  }));
}

export async function upsertProjectTableVisibilitySupabase(
  projectId: string | number,
  collectionName: string,
  visible: boolean,
): Promise<void> {
  const { error } = await supabase
    .from('project_table_visibility')
    .upsert(
      {
        project_id: String(projectId),
        collection_name: collectionName,
        visible,
      },
      { onConflict: 'project_id,collection_name' },
    );
  if (error) throw new Error(error.message);
}
