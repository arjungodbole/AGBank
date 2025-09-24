"use server";

interface CreateGroupParams {
  createdBy: string;
  name?: string; // Made optional
}

interface JoinGroupParams {
  userId: string;
  referralCode: string;
}

// Your existing function
export async function createGroup({ createdBy, name }: CreateGroupParams) {
  // Use default name if none provided
  const groupName = name || "Poker Game";
  
  const group = {
    id: Math.random().toString(36).slice(2, 10),
    name: groupName,
    createdBy,
    referralCode: Math.random().toString(36).slice(2, 8).toUpperCase(),
    createdAt: new Date(),
  };
  // e.g. await db.groups.insertOne(group);
  console.log("Created group:", group);
  return group;
}

// Server action that works with FormData from your form
export async function createGroupFromForm(formData: FormData) {
  const name = formData.get("name") as string;
  
  // TODO: Get the actual user ID from your authentication system
  // For now, using a placeholder - replace with actual user ID
  const createdBy = "user_placeholder"; // Replace with: await getCurrentUserId() or similar
  
  try {
    const group = await createGroup({ 
      createdBy, 
      name: name?.trim() || undefined // Pass undefined if no name provided
    });
    
    return group;
  } catch (error) {
    console.error("Failed to create group:", error);
    throw new Error("Failed to create group. Please try again.");
  }
}

export async function joinGroupWithReferral({ userId, referralCode }: JoinGroupParams) {
  // Look up the group by referral code
  // const group = await db.groups.findOne({ referralCode });
  const group = {
    id: "grp_" + Math.random().toString(36).slice(2, 8),
    name: "Example Group",
    referralCode,
  };

  if (!group) {
    throw new Error("Invalid referral code.");
  }

  // Add membership (idempotent-join recommended)
  // await db.groupMembers.updateOne(
  //   { groupId: group.id, userId },
  //   { $setOnInsert: { joinedAt: new Date() } },
  //   { upsert: true }
  // );

  return group;
}