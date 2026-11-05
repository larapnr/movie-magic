import { useEffect } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import ProtectedRoute from "./components/ProtectedRoute";
import Home from "./pages/Home";
import Browse from "./pages/Browse";
import Search from "./pages/Search";
import Detail from "./pages/Detail";
import Login from "./pages/Login";
import MyLists from "./pages/MyLists";
import Yolo from "./pages/Yolo";
import SceneFinder from "./pages/SceneFinder";
import NotFound from "./pages/NotFound";

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export default function App() {
  return (
    <div className="flex min-h-screen flex-col">
      <ScrollToTop />
      <Navbar />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/browse" element={<Browse />} />
          <Route path="/search" element={<Search />} />
          <Route path="/yolo" element={<Yolo />} />
          <Route path="/scene-finder" element={<SceneFinder />} />
          <Route path="/login" element={<Login />} />
          <Route
            path="/my-lists"
            element={
              <ProtectedRoute>
                <MyLists />
              </ProtectedRoute>
            }
          />
          <Route path="/:mediaType/:id" element={<Detail />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}
