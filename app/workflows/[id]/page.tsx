import { Suspense } from 'react';
import WorkflowEditor from '@/components/WorkflowEditor';

export default function WorkflowPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-full bg-white">
        <div className="w-4 h-4 border-2 border-gray-200 border-t-gray-400 rounded-full animate-spin" />
      </div>
    }>
      <WorkflowEditor />
    </Suspense>
  );
}
