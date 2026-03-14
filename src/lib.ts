import { Context } from "koishi";
import { XingruoResponse, XingruoRankResponse } from "./types";

export const siteMap: Record<string, string> = {
  "cloud": "1",
  "if-backrooms": "2",
};

export async function xingruoApiRequest(
  ctx: Context,
  sr: string,
  type: string
): Promise<XingruoResponse> {
  const url = "https://xingruo.chat/cromt/api/search/";
  try {
    return await ctx.http.get<XingruoResponse>(url, {
      params: { sr, type },
    });
  } catch (error) {
    throw new Error(error.message || "网络请求失败");
  }
}

export async function xingruoRankApiRequest(
  ctx: Context,
  au: string
): Promise<XingruoRankResponse> {
  const url = "https://xingruo.chat/cromt/api/rank/";
  try {
    return await ctx.http.get<XingruoRankResponse>(url, {
      params: { au },
    });
  } catch (error) {
    throw new Error(error.message || "网络请求失败");
  }
}