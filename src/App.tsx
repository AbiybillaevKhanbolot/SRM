/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { CrmProvider, useCrm } from './context/CrmContext';
import { LoginView } from './views/LoginView';
import { TopBar } from './components/TopBar';
import { DashboardView } from './views/DashboardView';
import { AttendanceView } from './views/AttendanceView';
import { LunchView } from './views/LunchView';
import { BreaksView } from './views/BreaksView';
import { CallsView } from './views/CallsView';
import { EmployeesView } from './views/EmployeesView';
import { ReportsView } from './views/ReportsView';
import { WheelTimePicker } from './components/WheelTimePicker';
import { ToastContainer } from './components/ToastContainer';
import { ConfirmModal } from './components/ConfirmModal';

const MainLayout: React.FC = () => {
  const { session, activeSection, timePickerModal, closeTimePicker } = useCrm();

  // Unauthenticated: show clean Login Screen
  if (!session) {
    return <LoginView />;
  }

  return (
    <div className="min-h-screen bg-[#ECEFF3] text-slate-800 flex flex-col antialiased selection:bg-[#B9F74A] selection:text-black">
      {/* Container window matching reference mockup */}
      <div className="w-full max-w-[1440px] mx-auto flex-1 flex flex-col p-2 sm:p-4 md:p-6 lg:p-8">
        {/* Top Header with Avatar, Pills Navigation & Action Badges */}
        <TopBar />

        {/* Dynamic Views in Bento Grid Canvas */}
        <main className="flex-1 w-full mt-2 md:mt-4">
          {activeSection === 'dashboard' && <DashboardView />}
          {activeSection === 'attendance' && <AttendanceView />}
          {activeSection === 'lunch' && <LunchView />}
          {activeSection === 'breaks' && <BreaksView />}
          {activeSection === 'calls' && <CallsView />}
          {activeSection === 'employees' && <EmployeesView />}
          {activeSection === 'reports' && <ReportsView />}
        </main>
      </div>

      {/* Global iOS Wheel Time Picker Modal */}
      <WheelTimePicker
        isOpen={timePickerModal.isOpen}
        initialTime={timePickerModal.initialTime}
        title={timePickerModal.title}
        subtitle={timePickerModal.subtitle}
        onSave={timePickerModal.onSave}
        onClose={closeTimePicker}
      />

      {/* In-App Confirmation Modal (Fixes Delete Buttons) */}
      <ConfirmModal />

      {/* Toast Feedback Alerts */}
      <ToastContainer />
    </div>
  );
};

export default function App() {
  return (
    <CrmProvider>
      <MainLayout />
    </CrmProvider>
  );
}
