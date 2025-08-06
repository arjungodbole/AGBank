// Create this new file: app/page.tsx
import { redirect } from "next/navigation";
import { getLoggedInUser } from "@/lib/actions/user.actions";

const RootPage = async () => {
  const loggedIn = await getLoggedInUser();

  if (loggedIn) {
    redirect("/reports");
  } else {
    redirect("/sign-in");
  }
};

export default RootPage;
