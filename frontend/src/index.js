import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";

import App from "./views/App";
import ErrorView from "./views/ErrorView";
import AdminMainView from "./views/admin/AdminMainView";
import StudentMainView from "./views/student/StudentMainView";
import StudentReportView from "./views/student/StudentReportView";

import "./index.css";
import reportWebVitals from "./reportWebVitals";

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    errorElement: <ErrorView />
  },
  {
    path: "/student/:studentId",
    element: <StudentMainView />
  },
  {
    path: "/student/:studentId/report",
    element: <StudentReportView />
  },
  {
    path: "/admin/:adminId",
    element: <AdminMainView />
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
