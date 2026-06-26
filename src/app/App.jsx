import { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { C, ff } from '../ui/tokens.js';
import GlobalStyles from './GlobalStyles.jsx';
import TabBar from './TabBar.jsx';
import HomeScreen from '../features/home/HomeScreen.jsx';
import RosterScreen from '../features/roster/RosterScreen.jsx';
import ScheduleScreen from '../features/schedule/ScheduleScreen.jsx';
import ContentScreen from '../features/content/ContentScreen.jsx';
import ChatScreen from '../features/chat/ChatScreen.jsx';
import MoreScreen from '../features/more/MoreScreen.jsx';
import OnboardingScreen from '../features/onboarding/OnboardingScreen.jsx';

export default function App() {
  const [scr, setScr] = useState('ob');
  const [tab, setTab] = useState(0);

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
      StatusBar.setBackgroundColor({ color: '#0C0C10' }).catch(() => {});
    }
  }, []);

  const tabs = [
    { l: 'Home', i: 'home' },
    { l: 'Roster', i: 'users' },
    { l: 'Schedule', i: 'cal' },
    { l: 'Content', i: 'book' },
    { l: 'Chat', i: 'chat' },
    { l: 'More', i: 'grid' },
  ];

  const views = [
    <HomeScreen key="h" go={setTab} />,
    <RosterScreen key="r" />,
    <ScheduleScreen key="s" />,
    <ContentScreen key="c" />,
    <ChatScreen key="ch" />,
    <MoreScreen key="m" />,
  ];

  return (
    <>
      <GlobalStyles />
      <div style={{ maxWidth: 430, margin: '0 auto', minHeight: '100vh', background: C.bg, fontFamily: ff, position: 'relative' }}>
        {scr === 'ob' ? (
          <OnboardingScreen done={() => setScr('app')} />
        ) : (
          <>
            <div style={{ overflowY: 'auto', height: '100vh' }}>{views[tab]}</div>
            <TabBar tabs={tabs} tab={tab} setTab={setTab} />
          </>
        )}
      </div>
    </>
  );
}
