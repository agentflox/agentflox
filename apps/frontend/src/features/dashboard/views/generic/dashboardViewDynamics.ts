"use client";

import dynamic from "next/dynamic";

export const ListView = dynamic(() => import("./ListView"));
export const BoardView = dynamic(() => import("./BoardView").then((mod) => mod.BoardView));
export const TableView = dynamic(() => import("./TableView").then((mod) => mod.TableView));
export const PeopleView = dynamic(() => import("./PeopleView ").then((mod) => mod.PeopleView));
export const ActivityView = dynamic(() => import("./ActivityView").then((mod) => mod.ActivityView));
export const CalendarView = dynamic(() => import("./CalendarView").then((mod) => mod.CalendarView));
export const GanttView = dynamic(() => import("./GanttView").then((mod) => mod.GanttView));
export const TimelineView = dynamic(() => import("./TimelineView").then((mod) => mod.TimelineView));
export const FormView = dynamic(() => import("./FormView").then((mod) => mod.FormView), { ssr: false });
export const MindMapView = dynamic(() => import("./MindMapView").then((mod) => mod.MindMapView), { ssr: false });
export const WorkloadView = dynamic(() => import("./WorkloadView").then((mod) => mod.WorkloadView));
export const WhiteboardView = dynamic(() => import("./WhiteboardView"));
export const MapView = dynamic(() => import("./MapView").then((mod) => mod.MapView), { ssr: false });
export const GenericDashboardView = dynamic(() => import("./DashboardView").then((mod) => mod.DashboardView));
export const EmbedView = dynamic(() => import("./EmbedView").then((mod) => mod.EmbedView));
export const DocView = dynamic(() => import("./DocView").then((mod) => mod.DocView));
