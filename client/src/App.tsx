import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { DataProvider } from "@/lib/mock-db";

import Dashboard from "@/pages/Dashboard";
import DailyEntry from "@/pages/DailyEntry";
import Inventory from "@/pages/Inventory";
import Items from "@/pages/Items";
import BOM from "@/pages/BOM";
import Prices from "@/pages/Prices";
import Closing from "@/pages/Closing";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard}/>
      <Route path="/daily-entry" component={DailyEntry}/>
      <Route path="/inventory" component={Inventory}/>
      <Route path="/master" component={Items}/>
      <Route path="/bom" component={BOM} /> 
      <Route path="/prices" component={Prices} />
      <Route path="/closing" component={Closing} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <DataProvider>
          <Toaster />
          <Router />
        </DataProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
