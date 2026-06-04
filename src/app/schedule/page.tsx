import { AppLayout } from '@/components/layout/AppLayout'
import ScheduleCalendar from '@/components/schedule/ScheduleCalendar'

export default function SchedulePage() {
  return (
    <AppLayout title="投稿カレンダー">
      <ScheduleCalendar />
    </AppLayout>
  )
}
