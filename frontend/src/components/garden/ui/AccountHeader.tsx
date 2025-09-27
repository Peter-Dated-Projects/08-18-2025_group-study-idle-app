import React from "react";

interface AccountHeaderProps {
  username?: string;
  accountBalance?: number;
}

export default function AccountHeader({
  username = "Player",
  accountBalance = 0,
}: AccountHeaderProps) {
  return (
    <div className="w-full flex justify-between items-center p-4 bg-[#e4be93ff] border border-[#a0622d] rounded text-[#2c1810] text-sm">
      <div className="font-bold">Welcome, {username}</div>
      <div className="font-bold">Balance: {accountBalance.toLocaleString()} coins</div>
    </div>
  );
}
