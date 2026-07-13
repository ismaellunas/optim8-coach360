import {
  Card,
  PageHeader,
  ScreenContainer,
} from '@/shared/ui/primitives.jsx';

export function ProfileScreen({ user, go, onSignOut }) {
  return (
    <ScreenContainer>
      <PageHeader title="PROFILE" onBack={function () { go('home'); }} />
      <div className="mb-6 text-center">
        <div className="mx-auto mb-3 flex h-[72px] w-[72px] items-center justify-center rounded-full bg-gradient-to-br from-coach-orange to-coach-orange-light font-display text-[28px] font-bold text-white">
          {user.name[0]}
        </div>
        <div className="font-display text-[22px] font-bold text-coach-t1">{user.name}</div>
        <div className="font-body text-[13px] capitalize text-coach-t3">
          {user.role + ' - ' + user.tier + ' tier'}
        </div>
        {user.email && <div className="mt-1 font-body text-xs text-coach-t3">{user.email}</div>}
      </div>
      <Card onClick={function () { go('subscription'); }}>
        <span className="font-body text-sm text-coach-t1">Manage Subscription</span>
      </Card>
      <Card>
        <span className="font-body text-sm text-coach-t1">Edit Profile</span>
      </Card>
      <Card>
        <span className="font-body text-sm text-coach-t1">Notifications</span>
      </Card>
      <Card onClick={onSignOut}>
        <span className="font-body text-sm text-coach-red">Sign Out</span>
      </Card>
    </ScreenContainer>
  );
}
