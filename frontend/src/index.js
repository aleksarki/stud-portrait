import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";

import App from "./views/App";
import ErrorView from "./views/ErrorView";

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

import StudentMainView from "./views/student/StudentMainView";
import StudentReportView from "./views/student/StudentReportView";

import SuperAuditView from "./views/super/SuperAuditView";
import SuperSqlView from "./views/super/SuperSqlView";
import SuperUploadView from "./views/super/SuperUploadView";

import reportWebVitals from "./reportWebVitals";
import "./index.css";

const router = createBrowserRouter([
  {
    path: "/",  // should be excluded
    element: <App />,
    errorElement: <ErrorView />
  },

  /* STUDENT VIEWS */

  {
    path: "/student/:studentId",
    element: <StudentMainView />
  },
  {
    path: "/student/:studentId/report/:reportType",
    element: <StudentReportView />
  },

  /* ADMIN VIEWS */

  {
    path: "/admin/",
    element: <AdminMainView />
  },
  {
    path: "/admin/geography",
    element: <AdminGeographyView />
  },
  {
    path: "/admin/help",
    element: <AdminHelpView />
  },
  {
    path: "/admin/stats",
    element: <AdminStatsView />
  },
  {
    path: "/admin/results",
    element: <AdminResultsView />
  },
  {
    path: "/admin/analysis/disciplines",
    element: <AdminAnalysisDisciplinesView />
  },
  {
    path: "/admin/analysis/advanced",
    element: <AdminAnalysisAdvancedView />
  },
  {
    path: "/admin/analysis/ai-analytics",
    element: <AdminAiAnalyticsView />
  },
  {
    path: "/admin/analysis/edu-profiles",
    element: <AdminAnalysisEduProfilesView />
  },
  {
    path: "/admin/analysis/transfered-students",
    element: <AdminTransferAnalysisView />
  },
  {
    path: "/admin/analysis/dublicate-accounts",
    element: <AdminDuplicateAccountsChecker />
  },
  {
    path: "/admin/analysis/anomalous-students",
    element: <AdminAnomalousStudentView />
  },
  {
    path: "/admin/courses",
    element: <AdminCoursesView />
  },
  {
    path: "/admin/grouping",
    element: <AdminGroupingView />
  },
  {
    path: "/admin/competences",
    element: <AdminCompetencesView/>
  },
  {
    path: "/admin/motivators",
    element: <AdminMotivatorsView/>
  },
  {
    path: "/admin/AP",
    element: <AdminAPView />
  },
  {
    path: "/admin/student/",
    element: <AdminStudentView />
  },

  /* SUPERADMIN VIEWS */

  {
    path: "/super/audit",
    element: <SuperAuditView />
  },
  {
    path: "/super/upload",
    element: <SuperUploadView />
  },
  {
    path: "/super/sql",
    element: <SuperSqlView />
  }
])

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
