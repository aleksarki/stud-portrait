import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";

import App from "./views/App";
import ErrorView from "./views/ErrorView";

import AdminAnalysisAdvancedView from "./views/admin/analysis/AdminAnalysisAdvancedView";
import AdminAnalysisDisciplinesView from "./views/admin/analysis/AdminAnalysisDisciplinesView";
import AdminAnalysisVamLgmView from "./views/admin/analysis/AdminAnalysisVamLgmView";

import AdminCoursesView from "./views/admin/AdminCoursesView";
import AdminGroupingView from "./views/admin/AdminGroupingView";
import AdminHelpView from "./views/admin/AdminHelpView";
import AdminMainView from "./views/admin/AdminMainView";
import AdminResultsView from "./views/admin/AdminResultsView";
import AdminStatsView from "./views/admin/AdminStatsView";
import AdminUploadView from "./views/admin/AdminUploadView";

import StudentMainView from "./views/student/StudentMainView";
import StudentReportView from "./views/student/StudentReportView";

import reportWebVitals from "./reportWebVitals";
import "./index.css";

const router = createBrowserRouter([
  {
    path: "/",  // should be excluded
    element: <App />,
    errorElement: <ErrorView />
  },
  {
    path: "/student/:studentId",
    element: <StudentMainView />
  },
  {
    path: "/student/:studentId/report/:reportType",
    element: <StudentReportView />
  },
  {
    path: "/admin/",
    element: <AdminMainView />
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
    path: "/admin/analysis/vam-lgm",
    element: <AdminAnalysisVamLgmView />
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
    path: "/admin/courses",
    element: <AdminCoursesView />
  },
  {
    path: "/admin/upload",
    element: <AdminUploadView />
  },
  {
    path: "/admin/grouping",
    element: <AdminGroupingView />
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
