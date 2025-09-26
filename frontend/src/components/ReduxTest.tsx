// Quick test component to verify Redux setup
"use client";

import { useAppSelector, useAppDispatch } from "@/store/hooks";
import { validateAuth } from "@/store/slices/authSlice";

export function ReduxTest() {
  const dispatch = useAppDispatch();
  const authState = useAppSelector((state) => state.auth);

  const handleTestAuth = () => {
    console.log("Testing Redux auth...");
    dispatch(validateAuth());
  };

  return (
    <div
      style={{
        position: "fixed",
        top: "10px",
        right: "10px",
        background: "white",
        padding: "10px",
        border: "2px solid red",
        zIndex: 9999,
        fontSize: "12px",
      }}
    >
      <h4>Redux Test</h4>
      <p>Auth State: {authState.isAuthenticated ? "Authenticated" : "Not Authenticated"}</p>
      <p>Loading: {authState.isLoading ? "Yes" : "No"}</p>
      <p>User: {authState.user?.userId || "None"}</p>
      <button onClick={handleTestAuth}>Test Auth</button>
    </div>
  );
}
