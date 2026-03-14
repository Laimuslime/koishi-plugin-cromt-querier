import { Context, Schema, h, Session } from "koishi";
import {} from "koishi-plugin-adapter-onebot";
import { xingruoApiRequest, xingruoRankApiRequest, siteMap } from "./lib";

declare module "koishi" {
  interface Tables {
    xingruoQuerier: XingruoQuerierTable;
  }
}

interface XingruoQuerierTable {
  id?: number;
  platform: string;
  channelId: string;
  defaultType: string;
}

export const name = "cromt-querier";
export const inject = ["database", "http"];

export function apply(ctx: Context) {
  ctx.model.extend("xingruoQuerier", {
    id: "unsigned",
    platform: "string(64)",
    channelId: "string(64)",
    defaultType: "string(64)",
  });

  const getType = async (typeArg: string | undefined, platform: string, channelId: string): Promise<string> => {
    if (typeArg && siteMap[typeArg]) return siteMap[typeArg];
    if (typeArg && /^\d+$/.test(typeArg)) return typeArg;
    const records = await ctx.database.get("xingruoQuerier", { platform, channelId });
    return records.length > 0 ? records[0].defaultType : "1";
  };

  const checkTimes = [10000, 30000, 60000, 90000, 11000, 12000];

  const checkAndDelete = async (session: Session, sentMessage: string): Promise<boolean> => {
    try {
      const message = await session.onebot.getMsg(session.messageId);

      if ((message as unknown as { raw_message: string })?.raw_message === "") {
        await session.onebot.deleteMsg(sentMessage);
        return true;
      }
      return false;
    } catch (error) {
      ctx.logger("cromt-querier").warn("检测或撤回消息失败:", error);
      return false;
    }
  };

  const scheduleChecks = (index: number, session: Session, sentMessage: string): void => {
    if (index >= checkTimes.length) return;

    ctx.setTimeout(
      async (): Promise<void> => {
        const deleted = await checkAndDelete(session, sentMessage);
        if (!deleted) {
          scheduleChecks(index + 1, session, sentMessage);
        }
      },
      index === 0 ? checkTimes[0] : checkTimes[index] - checkTimes[index - 1],
    );
  };

  ctx
    .command("default-type <站点:string>", "设置当前频道默认站点。")
    .action(async ({ session }, type) => {
      const typeId = siteMap[type] || type;
      if (!/^\d+$/.test(typeId)) return "站点编号不正确。";
      await ctx.database.upsert("xingruoQuerier", [{ 
        channelId: session.channelId, 
        platform: session.platform, 
        defaultType: typeId 
      }], ["platform", "channelId"]);
      return `设置成功，当前默认站点编号：${typeId}`;
    });

  ctx
    .command("cromt-search <标题:string> [站点:string]", "查询文章信息。")
    .alias("cromt-sr")
    .action(async ({ session }, title, typeArg) => {
      if (!title) return "请输入要查询的标题。";

      const type = await getType(typeArg, session.platform, session.channelId);

      try {
        const res = await xingruoApiRequest(ctx, title, type);

        if (res.code !== 200) {
          return `查询失败：${res.message || "未知错误"}`;
        }

        let data: any = null;
        if (res.data) {
          data = Array.isArray(res.data) ? res.data[0] : res.data;
        } else if ((res as any).title) {
          data = res;
        }
        
        if (!data || !data.title) {
          return `未找到关于“${title}”的内容。`;
        }

        const output = [
          `${data.title}`,
          `作者：${data.writer || "未知"}`,
          `字数：${data.number ? String(data.number).trim() : "未知"}`,
          `评分：${data.score || "未知"}`,
          `评论：${data.say || "0"}`,
          `${data.link || "无"}`
        ].join("\n");

        const response = (
          <template>
            <quote id={session.messageId} />
            {output}
          </template>
        );

        const sentMessages = await session.send(response);
        if (sentMessages.length > 0) {
          scheduleChecks(0, session, sentMessages[0]);
        }
        return;
      } catch (err) {
        return `请求出错：${err.message}`;
      }
    });

  ctx
    .command("cromt-author <作者或排行:string>", "查询作者排行信息。")
    .alias("cromt-au")
    .action(async ({ session }, author) => {
      if (!author) return "请输入要查询的作者或排行。";

      try {
        const res = await xingruoRankApiRequest(ctx, author);

        if (res.code !== 200) {
          return `查询失败：${res.message || "未知错误"}`;
        }

        if (!res.data || res.data.length === 0) {
          return `未找到关于“${author}”的内容。`;
        }

        const data = res.data[0];

        const output = [
          `${data.name} (#${data.rank})`,
          `总分：${data.total} 总页面数：${data.pages} 平均分：${data.average}`
        ].join("\n");

        const response = (
          <template>
            <quote id={session.messageId} />
            {output}
          </template>
        );

        const sentMessages = await session.send(response);
        if (sentMessages.length > 0) {
          scheduleChecks(0, session, sentMessages[0]);
        }
        return;
      } catch (err) {
        return `请求出错：${err.message}`;
      }
    });
}