import { useTranslation } from 'react-i18next';
import { useAuth } from '../auth/AuthContext';
import { useCustomerProject } from '../lib/useCustomerProject';
import { Customer3DViewer } from './Customer3DViewer';

export function Customer3D() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { project, loading } = useCustomerProject(user?.id);

  if (!user || loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-8 w-8 animate-pulse rounded-full border-2 border-neutral-300 border-t-black" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-8 text-center">
          <img src="/logo.ico" alt="" className="mx-auto mb-4 h-10 w-10 opacity-60" />
          <p className="text-sm text-neutral-700">
            {t('customer_3d_no_project', 'No project is linked to your account yet.')}
          </p>
        </div>
      </div>
    );
  }

  if (project.is3DUnlocked !== true) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-8 text-center">
          <img src="/logo.ico" alt="" className="mx-auto mb-4 h-10 w-10 opacity-60" />
          <p className="text-sm text-neutral-700">
            {t('dashboard_3d_locked_subtitle')}
          </p>
        </div>
      </div>
    );
  }

  return <Customer3DViewer projectId={project.id} />;
}

