import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";

import AdminAnalysisView from "./views/admin/AdminAnalysisView";
import AdminCoursesView from "./views/admin/AdminCoursesView";
import AdminMainView from "./views/admin/AdminMainView";
import AdminResultsView from "./views/admin/AdminResultsView";
import AdminStatsView from "./views/admin/AdminStatsView";
import AdminUploadView from "./views/admin/AdminUploadView";
import ErrorView from "./views/ErrorView";
import App from "./views/App";
import StudentMainView from "./views/student/StudentMainView";
import StudentReportView from "./views/student/StudentReportView";

import "./index.css";
import reportWebVitals from "./reportWebVitals";

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
    path: "/admin/stats",
    element: <AdminStatsView />
  },
  {
    path: "/admin/results",
    element: <AdminResultsView />
  },
  {
    path: "/admin/analysis",
    element: <AdminAnalysisView />
  },
  {
    path: "/admin/courses",
    element: <AdminCoursesView />
  },
  {
    path: "/admin/upload",
    element: <AdminUploadView />
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
