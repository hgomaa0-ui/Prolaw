'use client';
import useSWR from 'swr';
import axios from 'axios';

export default function TasksTable({ projectId }: { projectId: number }) {
  const { data, error } = useSWR(
    `/api/projects/${projectId}/tasks`,
    (url) => axios.get(url).then(r => r.data)
  );

  if (error) return <p className="text-danger">فشل جلب التـاسكات</p>;
  if (!data)   return <p>...تحميل التـاسكات</p>;
  if (data.length === 0) return <p>لا توجد تاسكات.</p>;

  return (
    <table className="table mt-3">
      <thead>
        <tr><th>العنوان</th><th>المحامي</th><th>الموعد</th><th>الحالة</th></tr>
      </thead>
      <tbody>
        {data.map((t: any) => (
          <tr key={t.id}>
            <td>{t.title}</td>
            <td>{t.assignee.name}</td>
            <td>{new Date(t.dueDate).toLocaleDateString()}</td>
            <td>{t.status}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}