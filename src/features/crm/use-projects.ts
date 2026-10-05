import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  addProjectAttachment,
  createProject,
  deleteProject,
  getProject,
  listProjectAssignableUsers,
  listProjects,
  renameProjectAttachment,
  updateProject,
  type ProjectInput,
} from '../../lib/api';

export const PROJECTS_QUERY_KEY = ['projects'];

export function useProjectAssignableUsersQuery() {
  return useQuery({
    queryKey: ['projects', 'assignable-users'],
    queryFn: listProjectAssignableUsers,
  });
}

export function useProjectsQuery(
  params: {
    page?: number;
    pageSize?: number;
    accountId?: string;
    q?: string;
  } = {},
  options: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: [...PROJECTS_QUERY_KEY, params],
    queryFn: () => listProjects(params),
    enabled: options.enabled ?? true,
  });
}

export function useProjectQuery(id: string) {
  return useQuery({
    queryKey: ['projects', id],
    queryFn: () => getProject(id),
    enabled: Boolean(id),
  });
}

export function useCreateProjectMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ProjectInput) => createProject(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: PROJECTS_QUERY_KEY });
    },
  });
}

export function useUpdateProjectMutation(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<ProjectInput>) => updateProject(id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: PROJECTS_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: ['projects', id] });
    },
  });
}

export function useDeleteProjectMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteProject(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: PROJECTS_QUERY_KEY });
    },
  });
}

/** Form "Kaydet"ine basilinca (proje olusturulduktan/guncellendikten hemen sonra)
 * secilmis dosyalari yukler - secim aninda degil, boylece kullanici yanlis dosya
 * secip Kaydet'ten once vazgecebilir. projectId her cagrida verilir cunku olusturma
 * akisinda proje id'si ancak mutation basarili olduktan sonra bilinir. */
export function useAddProjectAttachmentMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, file }: { projectId: string; file: File }) =>
      addProjectAttachment(projectId, file),
    onSuccess: () => {
      // ['projects', id] query'si id OLARAK ya proje UUID'si ya da projectNumber
      // slug'i tasiyabilir (bkz. useProjectQuery/ProjectDetailPage) - mutation'in
      // elindeki UUID her zaman aktif sorgunun anahtariyla eslesmeyebilir, bu yuzden
      // tum 'projects' on-ekli sorgular (liste + detay + assignable-users) genis
      // kapsamli invalidate edilir.
      void queryClient.invalidateQueries({ queryKey: PROJECTS_QUERY_KEY });
    },
  });
}

/** Zaten yuklu bir dosyanin goruntulenen adini degistirir (bkz. project-detail-page.tsx
 * Dosyalar tablosundaki duzenle ikonu). */
export function useRenameProjectAttachmentMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      projectId,
      attachmentId,
      fileName,
    }: {
      projectId: string;
      attachmentId: string;
      fileName: string;
    }) => renameProjectAttachment(projectId, attachmentId, fileName),
    onSuccess: () => {
      // bkz. useAddProjectAttachmentMutation'daki not - ayni id/slug uyusmazligi.
      void queryClient.invalidateQueries({ queryKey: PROJECTS_QUERY_KEY });
    },
  });
}
