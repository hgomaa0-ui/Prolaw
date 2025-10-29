import useSWR from 'swr';

export default function TasksTable({ projectId }: { projectId: number }) {
  const { data, error } = useSWR(
    `/api/projects/${projectId}/tasks`,
    (url) => fetch(url).then((r) => r.json())   // ← استخدم fetch بدلاً من axios
  );
  /* الباقى كما هو */
}