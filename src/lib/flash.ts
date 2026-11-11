import { redirect } from "next/navigation";

export function redirectWithNotice(path: string, notice: string) {
  const url = new URL(path, "http://local");
  url.searchParams.set("notice", notice);
  redirect(`${url.pathname}?${url.searchParams.toString()}`);
}
