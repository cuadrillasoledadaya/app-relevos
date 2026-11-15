import { StepDetailScreen } from '../../componentes/step-detail-screen'

interface StepDetailPageProps {
  params: Promise<{ id: string }>
}

/** Detail screen for one step and its relief timeline. */
export default async function StepDetailPage({ params }: StepDetailPageProps) {
  const { id } = await params

  return <StepDetailScreen stepId={id} />
}
