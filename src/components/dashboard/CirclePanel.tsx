"use client";

import { GroupMember, GroupRecord } from "@/types/groups";
import { Loader2, TargetIcon, Users } from "lucide-react";
import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { cn } from "@/lib/utils";
import { CardComponent } from "./CardComponent";
import { Button } from "../ui/button";

interface CirclePanelProps {
  activeGroup: GroupRecord | null;
  openLeaveConfirmation: () => void;
  isOwner: boolean;
  leavingGroup: boolean;
  setInviteGroup: (activeGroup: GroupRecord | null) => void;
  renderGroupMember: (member: GroupMember) => ReactNode;
}

const CirclePanel = ({
  activeGroup,
  openLeaveConfirmation,
  isOwner,
  setInviteGroup,
  leavingGroup,
  renderGroupMember,
}: CirclePanelProps) => {
  const CardIcon = () => (
    <TargetIcon
      aria-hidden
      className="lucide lucide-target h-[18px] w-[18px] text-[#0a1420]"
    />
  );

  const CardAction = () => {
    return isOwner ? (
      <Button onClick={() => setInviteGroup(activeGroup)} variant={"halo"}>
        <Users size={16} />
        Invite
      </Button>
    ) : (
      <Button
        onClick={openLeaveConfirmation}
        disabled={leavingGroup}
        variant={"halo"}
      >
        {leavingGroup && <Loader2 size={16} className="animate-spin" />}
        Leave group
      </Button>
    );
  };

  const CardContent = () =>
    activeGroup && (
      <div className="space-y-3">
        {activeGroup.members.map((member) => renderGroupMember(member))}
      </div>
    );

  return (
    <CardComponent
      icon={<CardIcon />}
      titleText="Circle"
      titleSubText={`Check ins in ${activeGroup?.name}`}
      titleAction={<CardAction />}
      content={<CardContent />}
    />
  );
};

export default CirclePanel;
