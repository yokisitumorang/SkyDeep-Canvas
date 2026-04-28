---
inclusion: always
---
<!------------------------------------------------------------------------------------
   Add rules to this file or a short description and have Kiro refine them for you.
   
   Learn about inclusion modes: https://kiro.dev/docs/steering/#inclusion-modes
-------------------------------------------------------------------------------------> 
# Web Information System Typography, Layout & Spacing Standards

## System Overview
- **Framework**: Tailwind CSS
- **Base Scale**: Major Second (1.125)

## Spacing Rules
- **Grid System**: Use a strict 4pt grid system. Tailwind's default spacing scale (1 = 4px) aligns perfectly. Do not use arbitrary values to ensure perfect vertical and horizontal rhythm.
- **Alignment & Gaps**: Prefer `gap` (Flex/Grid) over `space-x` / `space-y`. Avoid `space-*` utilities for responsive layouts as they break when child elements wrap.
  - **Micro Spacing**: Use `gap-2` (8px) for tightly related items (e.g., an icon next to text, or tags inside a row).
  - **Component Spacing**: Use `gap-4` (16px) for standard grouping (e.g., buttons in a footer, or input fields in a 2-column grid).
  - **Layout Spacing**: Use `gap-6` (24px) or `gap-8` (32px) for structural grids.
- **Padding (Inner Spacing)**: Maintain optical balance for components.
  - **Cards & Modals**: Use `p-6` (24px) for desktop views. Scale down to `p-4` (16px) on mobile viewports (`p-4 sm:p-6`).
  - **Buttons & Inputs**: Horizontal padding must always be greater than vertical padding. Standardize on `px-3 py-2` or `px-4 py-2`.
  - **Table Cells**: Use `px-3 py-4` or `px-4 py-4`.
- **Margin (Outer Spacing)**: Follow the law of proximity.
  - **Heading to Description**: Use `mt-1` (4px) or `mt-2` (8px) between an H1/H2 and its accompanying subtitle.
  - **Section Separators**: Use `mt-8` (32px) or `mt-12` (48px) to introduce a completely new section.
  - **Form Groups**: Use `mb-6` (24px) between distinct form questions/groups.

## Layout Rules
- **Page Header**: Use minimalist, text-only headers. Forbidden to use icons next to the title on index, create, or edit pages. Do not exceed `text-2xl` to maximize data density.
  - **Implementation**: `<div><h1 class="text-2xl font-bold text-slate-900">Page Title</h1><p class="text-sm text-slate-500 mt-1">Page description or sub-text.</p></div>`
- **Index Page (Data List)**: Use a dedicated native table wrapper. Do not wrap tables inside a generic `<Card>` component to prevent unnecessary DOM nesting and horizontal scrolling complications.
  - **Table Wrapper**: `<div class="mt-8 flow-root overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg"><table class="min-w-full divide-y divide-slate-300">...</table></div>`
  - **Pagination**: Place pagination elements inside the standard table wrapper container, immediately following the `overflow-x-auto` table element. Use `flex items-center justify-between border-t...`
- **Create & Edit Pages**: Utilize static flow action bars. Do not place a 'Back' arrow button next to the page title. Forbidden to use `fixed`, `sticky`, or `absolute` positioning for primary action bars, or contrasting background colors.
  - **Implementation**: Add the action container at the end of the form with `mt-12 border-t border-slate-200 pt-6 flex justify-end gap-3`.
- **Overlays & Backdrops**: Use a contextual smooth blur (`fixed inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity`) for all Sheets and Dialogs. Heavy blurs (`backdrop-blur-lg`) or 100% opaque backgrounds are forbidden.
- **Sheet (Slide-Over)**: Maintain strict vertical alignment. The Header, Body, and Footer must share the exact same horizontal padding (e.g., `px-4 sm:px-6`).
  - **Header**: `px-4 py-6 sm:px-6 flex items-start justify-between border-b border-slate-200`
  - **Body**: `flex-1 overflow-y-auto px-4 py-6 sm:px-6`. Do not wrap inputs in cards that add structural padding.
  - **Footer**: `flex-shrink-0 px-4 py-4 sm:px-6 border-t border-slate-200 flex justify-end gap-3 bg-white`

## Typography Scale
- **H1 (24px)**: `text-2xl font-bold`. Allowed for root module index titles and create/edit page titles. Forbidden to exceed `text-2xl`.
- **H2 (20px)**: `text-xl font-semibold`. Allowed for card titles, major section dividers, and main headings inside slide-overs.
- **H3 (18px)**: `text-lg font-medium`.
- **Body Large (16px)**: `text-base font-normal`.
- **Body Small (14px)**: `text-sm font-normal`. Allowed for data table row content, form input fields, sidebar navigation, and page header subtitles.
- **Caption (12px)**: `text-xs font-medium`. Allowed for form input labels, validation error messages, and data table column headers.

## Component Rules
- **Notifications**: Use `Sonner` for toast notifications. Position at bottom-right (`position="bottom-right"`). Messages must be concise (Entity + Action + Status, e.g., 'Profile updated successfully.').
  - **Success**: `bg-green-50 text-green-700 border-green-200`
  - **Error**: `bg-red-50 text-red-700 border-red-200`
  - **Info**: `bg-slate-50 text-slate-700 border-slate-200`
- **Data Tables**:
  - **Header**: `text-xs font-semibold uppercase tracking-wider text-slate-500 bg-slate-50 py-3.5 pl-4 pr-3 text-left sm:pl-6`
  - **Content Primary**: `text-sm font-medium text-slate-900 py-4 pl-4 pr-3 sm:pl-6 whitespace-nowrap`
  - **Content Secondary**: `text-sm font-normal text-slate-500 py-4 px-3 whitespace-nowrap`
  - **Content Numeric**: `font-mono text-sm font-normal text-slate-900 py-4 px-3 whitespace-nowrap text-right`
- **Badges**: Use `text-xs font-medium px-2 py-1 rounded-md ring-1 ring-inset`.
- **Forms**:
  - **Label**: `text-sm font-medium text-slate-900 leading-6 block mb-1`
  - **Input**: `text-sm text-slate-900 py-1.5 px-3 block w-full rounded-md border-0 ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600`
  - **Helper Text**: `text-xs text-slate-500 mt-2 block`
  - **Error Text**: `text-xs text-red-600 mt-2 font-medium block`
- **Buttons**:
  - **Primary**: `text-sm font-semibold text-white px-3 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-md shadow-sm`
  - **Secondary**: `text-sm font-semibold text-slate-900 px-3 py-2 bg-white rounded-md shadow-sm ring-1 ring-inset ring-slate-300 hover:bg-slate-50`
  - **Cancel**: `text-sm font-semibold text-slate-700 px-3 py-2 hover:bg-slate-100 rounded-md bg-transparent`

## Global Styles
- **Line Height**: Use `leading-relaxed` for content and `leading-tight` for headings.
- **Color Palette**: Standardize on `text-slate-900` for primary text, `text-slate-700` for secondary text, and `text-slate-500` for muted text.