
import React from 'react'
import SplitLayout from './components/layout/SplitLayout'
import ControlPanel from './components/panels/ControlPanel'
import CanvasKitPanel from './components/panels/CanvasKitPanel'
import { AppProvider } from './context'

export default function App(){
  return (
    <AppProvider>
      <SplitLayout columns={[34,32,34]} minPx={[260,260,320]}>
        {[<ControlPanel key="c"/>, <div key="empty" />, <CanvasKitPanel key="r"/>] as any}
      </SplitLayout>
    </AppProvider>
  )
}
