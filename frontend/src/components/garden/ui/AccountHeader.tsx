import React from "react";
import { FONTCOLOR, BORDERLINE, BORDERFILL } from "../../constants";

interface AccountHeaderProps {
  username?: string;
  accountBalance?: number;
}

export default function AccountHeader({
  username = "Player",
  accountBalance = 0,
}: AccountHeaderProps) {
  return (
    <div
      style={{
        width: "100%",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "15px",
        backgroundColor: BORDERFILL,
        border: `1px solid ${BORDERLINE}`,
        borderRadius: "6px",
        color: FONTCOLOR,
        fontSize: "14px",
      }}
    >
      <div style={{ fontWeight: "bold" }}>Welcome, {username}</div>
      <div style={{ fontWeight: "bold" }}>Balance: {accountBalance.toLocaleString()} coins</div>
    </div>
  );
}
