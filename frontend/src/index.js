import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, Navigate, RouterProvider } from "react-router-dom";

import ErrorView from "./views/ErrorView";
import Login from "./components/Login";

// Admin Views
import AdminAnalysisAdvancedView from "./views/admin/analysis/AdminAnalysisAdvancedView";
import AdminAnalysisDisciplinesView from "./views/admin/analysis/AdminAnalysisDisciplinesView";
import AdminAiAnalyticsView from "./views/admin/analysis/AdminAiAnalyticsView";
import AdminAnalysisEduProfilesView from "./views/admin/analysis/AdminAnalysisEduProfilesView";
import AdminTransferAnalysisView from "./views/admin/analysis/AdminTransferAnalysisView";
import AdminAnomalousStudentView from "./views/admin/analysis/AdminAnomalousStudentView";
import AdminDuplicateAccountsChecker from "./views/admin/analysis/AdminDuplicateAccountsChecker";

import AdminCoursesView from "./views/admin/AdminCoursesView";
import AdminGeographyView from "./views/admin/AdminGeographyView";
import AdminGroupingView from "./views/admin/AdminGroupingView";
import AdminHelpView from "./views/admin/AdminHelpView";
import AdminMainView from "./views/admin/AdminMainView";
import AdminMotivatorsView from "./views/admin/AdminMotivatorsView";
import AdminResultsView from "./views/admin/AdminResultsView";
import AdminStatsView from "./views/admin/AdminStatsView";
import AdminAPView from "./views/admin/AdminAPView";
import AdminCompetencesView from "./views/admin/AdminCompetencesView";
import AdminStudentView from "./views/admin/AdminStudentView";

// Student Views
import StudentMainView from "./views/student/StudentMainView";
import StudentReportView from "./views/student/StudentReportView";

// Superadmin Views
import SuperAuditView from "./views/super/SuperAuditView";
import SuperSqlView from "./views/super/SuperSqlView";
import SuperUploadView from "./views/super/SuperUploadView";

import reportWebVitals from "./reportWebVitals";
import "./index.css";

const PrivateRoute = ({ children, requiredRole }) => {
  const userData = localStorage.getItem('user');
  const user = userData ? JSON.parse(userData) : null;

  console.log('PrivateRoute check:', { user, requiredRole });

  if (!user) {
    console.log('No user, redirecting to login');
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && user.role !== requiredRole) {
    console.log(`Wrong role: ${user.role}, required: ${requiredRole}`);
    const redirectMap = {
      'superadmin': '/super/audit',
      'admin': '/admin/stats',
      'student': `/student/${user.participant_id || 'not-found'}`
    };
    return <Navigate to={redirectMap[user.role] || '/login'} replace />;
  }

  return children;
};

// Компонент для проверки авторизации и перенаправления на правильную страницу
const AuthRedirect = () => {
  const userData = localStorage.getItem('user');
  const user = userData ? JSON.parse(userData) : null;

  if (!user) {
      return <Navigate to="/login" replace />;
  }

  // Проверяем, что роль правильная
  const redirectMap = {
      'superadmin': '/super/audit',
      'admin': '/admin/stats',
      'student': `/student/${user.participant_id || 'not-found'}`
  };

  const redirectUrl = redirectMap[user.role] || '/login';
  return <Navigate to={redirectUrl} replace />;
};

const router = createBrowserRouter([
  // Публичные маршруты
  {
    path: '/login',
    element: <Login />
  },
  
  // Корневой маршрут - перенаправляет на основе роли
  {
    path: '/',
    element: <AuthRedirect />
  },

  // Студенческие маршруты (только для студентов)
  {
    path: "/student/:studentId",
    element: (
      <PrivateRoute requiredRole="student">
        <StudentMainView />
      </PrivateRoute>
    )
  },
  {
    path: "/student/:studentId/report/:reportType",
    element: (
      <PrivateRoute requiredRole="student">
        <StudentReportView />
      </PrivateRoute>
    )
  },

  // Административные маршруты (только для админов и суперадминов)
  {
    path: "/admin/",
    element: (
      <PrivateRoute requiredRole="admin">
        <AdminMainView />
      </PrivateRoute>
    )
  },
  {
    path: "/admin/geography",
    element: (
      <PrivateRoute requiredRole="admin">
        <AdminGeographyView />
      </PrivateRoute>
    )
  },
  {
    path: "/admin/help",
    element: (
      <PrivateRoute requiredRole="admin">
        <AdminHelpView />
      </PrivateRoute>
    )
  },
  {
    path: "/admin/stats",
    element: (
      <PrivateRoute requiredRole="admin">
        <AdminStatsView />
      </PrivateRoute>
    )
  },
  {
    path: "/admin/results",
    element: (
      <PrivateRoute requiredRole="admin">
        <AdminResultsView />
      </PrivateRoute>
    )
  },
  {
    path: "/admin/analysis/disciplines",
    element: (
      <PrivateRoute requiredRole="admin">
        <AdminAnalysisDisciplinesView />
      </PrivateRoute>
    )
  },
  {
    path: "/admin/analysis/advanced",
    element: (
      <PrivateRoute requiredRole="admin">
        <AdminAnalysisAdvancedView />
      </PrivateRoute>
    )
  },
  {
    path: "/admin/analysis/ai-analytics",
    element: (
      <PrivateRoute requiredRole="admin">
        <AdminAiAnalyticsView />
      </PrivateRoute>
    )
  },
  {
    path: "/admin/analysis/edu-profiles",
    element: (
      <PrivateRoute requiredRole="admin">
        <AdminAnalysisEduProfilesView />
      </PrivateRoute>
    )
  },
  {
    path: "/admin/analysis/transfered-students",
    element: (
      <PrivateRoute requiredRole="admin">
        <AdminTransferAnalysisView />
      </PrivateRoute>
    )
  },
  {
    path: "/admin/analysis/dublicate-accounts",
    element: (
      <PrivateRoute requiredRole="admin">
        <AdminDuplicateAccountsChecker />
      </PrivateRoute>
    )
  },
  {
    path: "/admin/analysis/anomalous-students",
    element: (
      <PrivateRoute requiredRole="admin">
        <AdminAnomalousStudentView />
      </PrivateRoute>
    )
  },
  {
    path: "/admin/courses",
    element: (
      <PrivateRoute requiredRole="admin">
        <AdminCoursesView />
      </PrivateRoute>
    )
  },
  {
    path: "/admin/grouping",
    element: (
      <PrivateRoute requiredRole="admin">
        <AdminGroupingView />
      </PrivateRoute>
    )
  },
  {
    path: "/admin/competences",
    element: (
      <PrivateRoute requiredRole="admin">
        <AdminCompetencesView />
      </PrivateRoute>
    )
  },
  {
    path: "/admin/motivators",
    element: (
      <PrivateRoute requiredRole="admin">
        <AdminMotivatorsView />
      </PrivateRoute>
    )
  },
  {
    path: "/admin/AP",
    element: (
      <PrivateRoute requiredRole="admin">
        <AdminAPView />
      </PrivateRoute>
    )
  },
  {
    path: "/admin/student/",
    element: (
      <PrivateRoute requiredRole="admin">
        <AdminStudentView />
      </PrivateRoute>
    )
  },

  // Суперадминские маршруты (только для суперадминов)
  {
    path: "/super/audit",
    element: (
      <PrivateRoute requiredRole="superadmin">
        <SuperAuditView />
      </PrivateRoute>
    )
  },
  {
    path: "/super/upload",
    element: (
      <PrivateRoute requiredRole="superadmin">
        <SuperUploadView />
      </PrivateRoute>
    )
  },
  {
    path: "/super/sql",
    element: (
      <PrivateRoute requiredRole="superadmin">
        <SuperSqlView />
      </PrivateRoute>
    )
  },

  // Обработка 404 - перенаправление на логин
  {
    path: '*',
    element: <Navigate to="/login" replace />
  }
]);

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
