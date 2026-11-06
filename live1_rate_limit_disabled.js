const OWNER_ID = 1299357422;
const STREAMTIME_ALLOWED_IDS = [
  1299357422
];
const SUPPORT_ADMIN_IDS = [];
const MENU_TEXT = `
🤖 پنل اصلی
از منوی زیر یک گزینه را انتخاب کنید:
`;
const ADS_TEXT = `
🎥 درخواست عضویت در تیم Streamer

در صورتی که قصد عضویت در تیم استریمر سرور را دارید، درخواست خود را برای ساپورتر ارسال کنید.

پس از بررسی اولیه، فرم عضویت برای شما ارسال خواهد شد. لطفاً فرم را با اطلاعات دقیق و کامل تکمیل کرده و برای ساپورتر ارسال کنید.

📋 اطلاعات موردنیاز:
نام و نام خانوادگی:
نام کاربری داخل سرور:
سن:
پلتفرم استریم:
لینک کانال:
مدت فعالیت در زمینه استریم:
تعداد فالوور / سابسکرایبر:
ساعت و روزهای معمول استریم:
توضیحات یا سوابق مرتبط:

⚠️ اطلاعات واردشده باید صحیح و قابل بررسی باشند.

پس از ارسال فرم، درخواست شما توسط مسئول تیم بررسی شده و نتیجه از طریق تلگرام به شما اطلاع داده خواهد شد.
`;

const RULES_TEXT = `

💎 مزایا و شرایط استریمرهای سرور IranMTA

استریمرهای فعال سرور IranMTA با توجه به میزان فعالیت، بازدید و کیفیت استریم، می‌توانند از مزایای ویژه استریمری بهره‌مند شوند.

🎁 مزایای استریمرها:

- 💰 دریافت حقوق و پاداش استریم به‌صورت دوره‌ای
- 🪙 دریافت گلد توکن (Gold Token)
- 💵 دریافت پول داخل بازی (In-Game Money)
- 💎 دریافت آیتم‌ها و امکانات ویژه داخل سرور
- 🏷️ دریافت رنک یا تگ اختصاصی استریمر
- ⭐ امکان دریافت پاداش ویژه برای استریم‌های فعال و پربازدید
- 🎁 شرکت در برنامه‌ها و جوایز مخصوص استریمرها
- 📢 حمایت و تبلیغ کانال استریمر توسط مدیریت سرور (در صورت تأیید)

📌 شرایط دریافت مزایا:

1. استریم باید از سرور IranMTA باشد.
2. استریم از سایر سرورهای MTA ممنوع است.
3. استریم در بازی‌های دیگر هیچ محدودیتی ندارد.
4. استریمر باید فعالیت منظم و مستمر داشته باشد.
5. رعایت کامل قوانین سرور الزامی است.
6. میزان حقوق، گلد توکن و پول بازی بر اساس فعالیت و عملکرد استریمر توسط مدیریت تعیین می‌شود.
7. ارائه لینک استریم‌ها برای بررسی فعالیت الزامی است.

⚠️ توجه: دریافت مزایا منوط به تأیید مدیریت سرور بوده و میزان پاداش با توجه به عملکرد هر استریمر مشخص خواهد شد.

❤️ **IranMTA | Streamer Program**
`;
export default {
  async scheduled(event, env, ctx) {
    await processTeamReminders(env);
    await processExpiredTrials(env);
    await processExpiredStreamAnnouncements(env);
    await processDailyOwnerReport(env);
  },
  async fetch(request, env) {
    if (request.method !== "POST") {
      return new Response("Method Not Allowed", {
        status: 405,
        headers: { "Allow": "POST", "Cache-Control": "no-store" }
      });
    }

    // Validate Telegram webhook secret before parsing or processing updates.
    const expectedSecret = String(env.WEBHOOK_SECRET || "");
    if (expectedSecret.length < 32) {
      console.error("WEBHOOK_SECRET is missing or too short; configure a random secret of at least 32 characters.");
      return new Response("Webhook secret is not configured securely.", {
        status: 503,
        headers: { "Cache-Control": "no-store" }
      });
    }
    const receivedSecret = request.headers.get("X-Telegram-Bot-Api-Secret-Token") || "";
    if (receivedSecret.length !== expectedSecret.length || receivedSecret !== expectedSecret) {
      return new Response("Forbidden", {
        status: 403,
        headers: { "Cache-Control": "no-store" }
      });
    }

    // Reject unexpected payload types and oversized requests before JSON parsing.
    const contentType = String(request.headers.get("Content-Type") || "").toLowerCase();
    if (!contentType.includes("application/json")) {
      return new Response("Unsupported Media Type", {
        status: 415,
        headers: { "Cache-Control": "no-store" }
      });
    }
    const contentLength = Number(request.headers.get("Content-Length") || 0);
    if (Number.isFinite(contentLength) && contentLength > 1_000_000) {
      return new Response("Payload Too Large", {
        status: 413,
        headers: { "Cache-Control": "no-store" }
      });
    }

    try {
      const rawBody = await request.text();
      if (!rawBody || rawBody.length > 1_000_000) {
        return new Response("Payload Too Large or Empty", {
          status: 413,
          headers: { "Cache-Control": "no-store" }
        });
      }
      const update = JSON.parse(rawBody);
      if (!update || typeof update !== "object" || Array.isArray(update)) {
        return new Response("Bad Request", {
          status: 400,
          headers: { "Cache-Control": "no-store" }
        });
      }

      // Automatic per-user rate limiting is disabled.
      // Other bot features and webhook validation remain unchanged.

      if (update.callback_query) {
        const callback =
          update.callback_query;
        const data =
          callback.data || "";
        const chatId =
          callback.message.chat.id;
        const userId =
          callback.from.id;
        await saveTelegramProfile(
          env,
          callback.from
        );
        const enhancedCallbackHandled = await handleEnhancedCallback(env, callback);
        if (enhancedCallbackHandled) {
          return new Response("OK");
        }
        if (data === "home") {
          await deleteAdminState(
            env,
            userId
          );
          await deleteStreamTimeState(
            env,
            userId
          );
          await deleteStreamAnnounceState(
            env,
            userId
          );
          await sendMainMenu(
            env,
            chatId
          );
          await telegram(
            env,
            "answerCallbackQuery",
            {
              callback_query_id:
                callback.id
            }
          );
          return new Response("OK");
        }
        if (
          Number(userId) !==
          Number(OWNER_ID)
        ) {
          await telegram(
            env,
            "answerCallbackQuery",
            {
              callback_query_id:
                callback.id,
              text:
                "❌ شما دسترسی ندارید.",
              show_alert:
                true
            }
          );
          return new Response("OK");
        }
        if (data === "manual_stream_add" || data === "manual_stream_remove") {
          await deleteAdminState(env, userId);
          await sendManualStreamMemberPicker(env, chatId, data === "manual_stream_add" ? "add" : "remove");
          await telegram(env, "answerCallbackQuery", { callback_query_id: callback.id });
          return new Response("OK");
        }
        if (data === "trial_manage") {
          await sendTeamDashboard(env, chatId);
          await telegram(env, "answerCallbackQuery", { callback_query_id: callback.id });
          return new Response("OK");
        }
        if (data === "trial_start" || data === "trial_stop") {
          await sendTrialMemberPicker(env, chatId, data === "trial_start" ? "start" : "stop");
          await telegram(env, "answerCallbackQuery", { callback_query_id: callback.id });
          return new Response("OK");
        }
        if (data.startsWith("manual_stream_member:") || data.startsWith("trial_member:")) {
          const parts = data.split(":");
          const type = parts[0];
          const action = parts[1];
          const targetId = Number(parts[2]);
          const members = await getStreamTimeMembers(env);
          if (!targetId || !members.includes(targetId)) {
            await telegram(env, "answerCallbackQuery", { callback_query_id: callback.id, text: "❌ عضو نامعتبر است.", show_alert: true });
            return new Response("OK");
          }
          if (type === "trial_member") {
            if (action === "start") {
              await promptTeamTrialDuration(env, chatId, targetId);
            } else {
              await stopTeamTrial(env, targetId);
              await telegram(env, "sendMessage", { chat_id: chatId, text: "✅ Trial این عضو پایان یافت." });
            }
          } else {
            await saveAdminState(env, userId, { action: action === "add" ? "manual_stream_add" : "manual_stream_remove", step: 1, data: { userId: targetId } });
            await telegram(env, "sendMessage", { chat_id: chatId, text: action === "add" ? "⏱️ مدت StreamTime را وارد کن.\n\nمثال: 2 یا 2:30" : "⏱️ مدت زمانی که می‌خواهی حذف شود را وارد کن.\n\nمثال: 1 یا 1:30" });
          }
          await telegram(env, "answerCallbackQuery", { callback_query_id: callback.id });
          return new Response("OK");
        }

        if (
          data ===
          "streamtime_manage"
        ) {
          await deleteAdminState(
            env,
            userId
          );
          await sendStreamTimeManagementMenu(
            env,
            chatId
          );
          await telegram(
            env,
            "answerCallbackQuery",
            {
              callback_query_id:
                callback.id
            }
          );
          return new Response("OK");
        }
        if (data.startsWith("streamtime_group_text_select:")) {
          const targetChatId = data.slice("streamtime_group_text_select:".length);
          const groups = await getStreamTimeGroups(env);
          const group = groups.find(g => String(g.chatId) === String(targetChatId));
          if (!group) {
            await telegram(env, "answerCallbackQuery", { callback_query_id: callback.id, text: "❌ گروه پیدا نشد.", show_alert: true });
            return new Response("OK");
          }
          await deleteAdminState(env, userId);
          await deleteStreamTimeState(env, userId);
          await deleteStreamAnnounceState(env, userId);
          await saveAdminState(env, userId, { action: "streamtime_group_text", step: 1, data: { chatId: String(group.chatId) } });
          await telegram(env, "sendMessage", {
            chat_id: chatId,
            text: `📨 <b>ارسال متن به ${escapeHtml(group.title)}</b>\n\nمتنی که می‌خواهی داخل گروه ارسال شود را در یک پیام بفرست:`,
            parse_mode: "HTML",
            reply_markup: { inline_keyboard: [[{ text: "❌ لغو", callback_data: "streamtime_group_manage" }]] }
          });
          await telegram(env, "answerCallbackQuery", { callback_query_id: callback.id });
          return new Response("OK");
        }
        if (
          data ===
          "streamtime_group_manage"
        ) {
          await deleteAdminState(
            env,
            userId
          );
          await sendStreamTimeGroupManagementMenu(
            env,
            chatId
          );
          await telegram(
            env,
            "answerCallbackQuery",
            {
              callback_query_id:
                callback.id
            }
          );
          return new Response("OK");
        }
        if (
          data ===
          "streamtime_group_add"
        ) {
          await deleteAdminState(
            env,
            userId
          );
          await deleteStreamTimeState(
            env,
            userId
          );
          await deleteStreamAnnounceState(
            env,
            userId
          );
          await saveAdminState(
            env,
            userId,
            {
              action:
                "streamtime_group_add",
              step:
                1,
              data:
                {}
            }
          );
          await telegram(
            env,
            "sendMessage",
            {
              chat_id:
                chatId,
              text:
                "➕ <b>افزودن گروه StreamTime</b>\n\n" +
                "Chat ID گروه را وارد کنید:\n\n" +
                "مثال:\n" +
                "-1001234567890\n\n" +
                "⚠️ بات باید داخل گروه عضو باشد و اجازه ارسال پیام داشته باشد.",
              parse_mode:
                "HTML"
            }
          );
          await telegram(
            env,
            "answerCallbackQuery",
            {
              callback_query_id:
                callback.id
            }
          );
          return new Response("OK");
        }
        if (
          data ===
          "streamtime_group_remove"
        ) {
          await deleteAdminState(
            env,
            userId
          );
          await deleteStreamTimeState(
            env,
            userId
          );
          await deleteStreamAnnounceState(
            env,
            userId
          );
          await saveAdminState(
            env,
            userId,
            {
              action:
                "streamtime_group_remove",
              step:
                1,
              data:
                {}
            }
          );
          await telegram(
            env,
            "sendMessage",
            {
              chat_id:
                chatId,
              text:
                "➖ <b>حذف گروه StreamTime</b>\n\n" +
                "Chat ID گروهی که می‌خواهی حذف شود را وارد کن:\n\n" +
                "مثال:\n" +
                "-1001234567890",
              parse_mode:
                "HTML"
            }
          );
          await telegram(
            env,
            "answerCallbackQuery",
            {
              callback_query_id:
                callback.id
            }
          );
          return new Response("OK");
        }
        if (
          data ===
          "streamtime_group_list"
        ) {
          await sendStreamTimeGroups(
            env,
            chatId
          );
          await telegram(
            env,
            "answerCallbackQuery",
            {
              callback_query_id:
                callback.id
            }
          );
          return new Response("OK");
        }
        if (
          data ===
          "streamtime_group_test"
        ) {
          const result =
            await sendStreamTimeGroupTest(
              env
            );
          let resultText =
            "🧪 <b>تست گروه‌های StreamTime</b>\n\n" +
            `📡 تعداد گروه‌ها: ${result.total}\n` +
            `✅ موفق: ${result.success}\n` +
            `❌ ناموفق: ${result.failed}`;
          if (
            result.failedItems &&
            result.failedItems.length > 0
          ) {
            resultText +=
              "\n\n❌ گروه‌های ناموفق:\n";
            for (
              const item of result.failedItems
            ) {
              resultText +=
                `• ${escapeHtml(item.title)}\n`;
            }
          }
          await telegram(
            env,
            "sendMessage",
            {
              chat_id:
                chatId,
              text:
                resultText,
              parse_mode:
                "HTML",
              reply_markup: {
                inline_keyboard: [
                  [
                    {
                      text:
                        "🔄 تست دوباره",
                      callback_data:
                        "streamtime_group_test"
                    }
                  ],
                  [
                    {
                      text:
                        "🔙 مدیریت گروه‌ها",
                      callback_data:
                        "streamtime_group_manage"
                    }
                  ]
                ]
              }
            }
          );
          await telegram(
            env,
            "answerCallbackQuery",
            {
              callback_query_id:
                callback.id
            }
          );
          return new Response("OK");
        }
        if (
          data ===
          "streamtime_group_text"
        ) {
          const groups = await getStreamTimeGroups(env);
          if (!groups.length) {
            await telegram(env, "sendMessage", {
              chat_id: chatId,
              text: "❌ هنوز هیچ گروهی برای ارسال متن ثبت نشده است.",
              reply_markup: { inline_keyboard: [[{ text: "🔙 مدیریت گروه‌ها", callback_data: "streamtime_group_manage" }]] }
            });
          } else {
            const rows = groups.map(group => [{
              text: `📡 ${group.title}`,
              callback_data: `streamtime_group_text_select:${group.chatId}`
            }]);
            rows.push([{ text: "🔙 مدیریت گروه‌ها", callback_data: "streamtime_group_manage" }]);
            await telegram(env, "sendMessage", {
              chat_id: chatId,
              text: "📨 <b>انتخاب گروه برای ارسال متن</b>\n\nگروهی که می‌خواهی پیام داخل آن ارسال شود را انتخاب کن:",
              parse_mode: "HTML",
              reply_markup: { inline_keyboard: rows }
            });
          }
          await telegram(env, "answerCallbackQuery", { callback_query_id: callback.id });
          return new Response("OK");
        }
        if (
          data ===
          "streamtime_time_manage"
        ) {
          await deleteAdminState(
            env,
            userId
          );
          await sendStreamTimeTimeMembers(
            env,
            chatId
          );
          await telegram(
            env,
            "answerCallbackQuery",
            {
              callback_query_id:
                callback.id
            }
          );
          return new Response("OK");
        }
        if (
          data.startsWith(
            "streamtime_time_member:"
          )
        ) {
          const targetId =
            Number(
              data.split(":")[1]
            );
          if (!targetId) {
            await telegram(
              env,
              "answerCallbackQuery",
              {
                callback_query_id:
                  callback.id,
                text:
                  "❌ اطلاعات کاربر نامعتبر است.",
                show_alert:
                  true
              }
            );
            return new Response("OK");
          }
          const members =
            await getStreamTimeMembers(
              env
            );
          if (
            !members.includes(
              targetId
            )
          ) {
            await telegram(
              env,
              "answerCallbackQuery",
              {
                callback_query_id:
                  callback.id,
                text:
                  "❌ این کاربر عضو StreamTime نیست.",
                show_alert:
                  true
              }
            );
            return new Response("OK");
          }
          const profile =
            await getTelegramProfile(
              env,
              targetId
            );
          const total =
            await getTotalStreamTime(
              env,
              targetId
            );
          await saveAdminState(
            env,
            userId,
            {
              action:
                "time_manage",
              step:
                1,
              data: {
                userId:
                  targetId
              }
            }
          );
          await telegram(
            env,
            "sendMessage",
            {
              chat_id:
                chatId,
              text:
                "🕐 <b>مدیریت تایم استریم</b>\n\n" +
                `${formatTelegramProfile(profile, targetId)}\n\n` +
                `⏱️ تایم فعلی: <b>${formatDuration(total)}</b>\n\n` +
                "عملیات موردنظر را انتخاب کنید:",
              parse_mode:
                "HTML",
              reply_markup: {
                inline_keyboard: [
                  [
                    {
                      text:
                        "➕ افزایش تایم",
                      callback_data:
                        `streamtime_time_add:${targetId}`
                    }
                  ],
                  [
                    {
                      text:
                        "➖ کاهش تایم",
                      callback_data:
                        `streamtime_time_subtract:${targetId}`
                    }
                  ],
                  [
                    {
                      text:
                        "📝 تعیین مستقیم تایم",
                      callback_data:
                        `streamtime_time_set:${targetId}`
                    }
                  ],
                  [
                    {
                      text:
                        "🔙 لیست اعضا",
                      callback_data:
                        "streamtime_time_manage"
                    }
                  ],
                  [
                    {
                      text:
                        "🏠 منوی اصلی",
                      callback_data:
                        "home"
                    }
                  ]
                ]
              }
            }
          );
          await telegram(
            env,
            "answerCallbackQuery",
            {
              callback_query_id:
                callback.id
            }
          );
          return new Response("OK");
        }
        if (
          data.startsWith(
            "streamtime_time_add:"
          )
        ) {
          const targetId =
            Number(
              data.split(":")[1]
            );
          if (!targetId) {
            await telegram(
              env,
              "answerCallbackQuery",
              {
                callback_query_id:
                  callback.id,
                text:
                  "❌ اطلاعات کاربر نامعتبر است.",
                show_alert:
                  true
              }
            );
            return new Response("OK");
          }
          const members =
            await getStreamTimeMembers(
              env
            );
          if (
            !members.includes(
              targetId
            )
          ) {
            await telegram(
              env,
              "answerCallbackQuery",
              {
                callback_query_id:
                  callback.id,
                text:
                  "❌ این کاربر دیگر عضو StreamTime نیست.",
                show_alert:
                  true
              }
            );
            return new Response("OK");
          }
          await deleteStreamTimeState(
            env,
            userId
          );
          await deleteStreamAnnounceState(
            env,
            userId
          );
          await saveAdminState(
            env,
            userId,
            {
              action:
                "time_adjust",
              step:
                1,
              data: {
                userId:
                  targetId,
                mode:
                  "add"
              }
            }
          );
          const current =
            await getTotalStreamTime(
              env,
              targetId
            );
          await telegram(
            env,
            "sendMessage",
            {
              chat_id:
                chatId,
              text:
                "➕ <b>افزایش تایم</b>\n\n" +
                `⏱️ تایم فعلی: <b>${formatDuration(current)}</b>\n\n` +
                "مقدار زمانی که می‌خواهی اضافه شود را وارد کن.\n\n" +
                "مثال:\n" +
                "2\n" +
                "2:30\n" +
                "0:45",
              parse_mode:
                "HTML"
            }
          );
          await telegram(
            env,
            "answerCallbackQuery",
            {
              callback_query_id:
                callback.id
            }
          );
          return new Response("OK");
        }
        if (
          data.startsWith(
            "streamtime_time_subtract:"
          )
        ) {
          const targetId =
            Number(
              data.split(":")[1]
            );
          if (!targetId) {
            await telegram(
              env,
              "answerCallbackQuery",
              {
                callback_query_id:
                  callback.id,
                text:
                  "❌ اطلاعات کاربر نامعتبر است.",
                show_alert:
                  true
              }
            );
            return new Response("OK");
          }
          const members =
            await getStreamTimeMembers(
              env
            );
          if (
            !members.includes(
              targetId
            )
          ) {
            await telegram(
              env,
              "answerCallbackQuery",
              {
                callback_query_id:
                  callback.id,
                text:
                  "❌ این کاربر دیگر عضو StreamTime نیست.",
                show_alert:
                  true
              }
            );
            return new Response("OK");
          }
          await deleteStreamTimeState(
            env,
            userId
          );
          await deleteStreamAnnounceState(
            env,
            userId
          );
          await saveAdminState(
            env,
            userId,
            {
              action:
                "time_adjust",
              step:
                1,
              data: {
                userId:
                  targetId,
                mode:
                  "subtract"
              }
            }
          );
          const current =
            await getTotalStreamTime(
              env,
              targetId
            );
          await telegram(
            env,
            "sendMessage",
            {
              chat_id:
                chatId,
              text:
                "➖ <b>کاهش تایم</b>\n\n" +
                `⏱️ تایم فعلی: <b>${formatDuration(current)}</b>\n\n` +
                "مقدار زمانی که می‌خواهی کم شود را وارد کن.\n\n" +
                "مثال:\n" +
                "2\n" +
                "2:30\n" +
                "0:45\n\n" +
                "⚠️ تایم نهایی کمتر از 0 نمی‌شود.",
              parse_mode:
                "HTML"
            }
          );
          await telegram(
            env,
            "answerCallbackQuery",
            {
              callback_query_id:
                callback.id
            }
          );
          return new Response("OK");
        }
        if (
          data.startsWith(
            "streamtime_time_set:"
          )
        ) {
          const targetId =
            Number(
              data.split(":")[1]
            );
          if (!targetId) {
            await telegram(
              env,
              "answerCallbackQuery",
              {
                callback_query_id:
                  callback.id,
                text:
                  "❌ اطلاعات کاربر نامعتبر است.",
                show_alert:
                  true
              }
            );
            return new Response("OK");
          }
          const members =
            await getStreamTimeMembers(
              env
            );
          if (
            !members.includes(
              targetId
            )
          ) {
            await telegram(
              env,
              "answerCallbackQuery",
              {
                callback_query_id:
                  callback.id,
                text:
                  "❌ این کاربر دیگر عضو StreamTime نیست.",
                show_alert:
                  true
              }
            );
            return new Response("OK");
          }
          await deleteStreamTimeState(
            env,
            userId
          );
          await deleteStreamAnnounceState(
            env,
            userId
          );
          await saveAdminState(
            env,
            userId,
            {
              action:
                "time_set",
              step:
                1,
              data: {
                userId:
                  targetId
              }
            }
          );
          const current =
            await getTotalStreamTime(
              env,
              targetId
            );
          await telegram(
            env,
            "sendMessage",
            {
              chat_id:
                chatId,
              text:
                "📝 <b>تعیین مستقیم تایم</b>\n\n" +
                `⏱️ تایم فعلی: <b>${formatDuration(current)}</b>\n\n` +
                "تایم جدید را وارد کن.\n\n" +
                "مثال:\n" +
                "5\n" +
                "5:30\n" +
                "0\n" +
                "0:45",
              parse_mode:
                "HTML"
            }
          );
          await telegram(
            env,
            "answerCallbackQuery",
            {
              callback_query_id:
                callback.id
            }
          );
          return new Response("OK");
        }
        if (
          data ===
          "streamannounce_manage"
        ) {
          await deleteAdminState(
            env,
            userId
          );
          await deleteStreamAnnounceState(
            env,
            userId
          );
          await deleteStreamTimeState(
            env,
            userId
          );
          await sendStreamAnnounceManagementMenu(
            env,
            chatId
          );
          await telegram(
            env,
            "answerCallbackQuery",
            {
              callback_query_id:
                callback.id
            }
          );
          return new Response("OK");
        }
        if (
          data ===
          "streamannounce_access_manage"
        ) {
          await deleteAdminState(
            env,
            userId
          );
          await sendStreamAnnouncementAccessMembers(
            env,
            chatId
          );
          await telegram(
            env,
            "answerCallbackQuery",
            {
              callback_query_id:
                callback.id
            }
          );
          return new Response("OK");
        }
        if (
          data.startsWith(
            "streamannounce_access_member:"
          )
        ) {
          const targetId =
            Number(
              data.split(":")[1]
            );
          if (!targetId) {
            await telegram(
              env,
              "answerCallbackQuery",
              {
                callback_query_id:
                  callback.id,
                text:
                  "❌ اطلاعات کاربر نامعتبر است.",
                show_alert:
                  true
              }
            );
            return new Response("OK");
          }
          const members =
            await getStreamTimeMembers(
              env
            );
          if (
            !members.includes(
              targetId
            )
          ) {
            await telegram(
              env,
              "answerCallbackQuery",
              {
                callback_query_id:
                  callback.id,
                text:
                  "❌ این کاربر عضو تأییدشده StreamTime نیست.",
                show_alert:
                  true
              }
            );
            return new Response("OK");
          }
          const profile =
            await getTelegramProfile(
              env,
              targetId
            );
          const allowed =
            await isAllowedStreamAnnouncement(
              env,
              targetId
            );
          await telegram(
            env,
            "sendMessage",
            {
              chat_id:
                chatId,
              text:
                "📣 <b>مدیریت دسترسی اعلام استریم</b>\n\n" +
                `${formatTelegramProfile(profile, targetId)}\n\n` +
                `📣 وضعیت اعلام استریم: <b>${allowed ? "✅ دارد" : "❌ ندارد"}</b>\n\n` +
                "دسترسی این کاربر را انتخاب کنید:",
              parse_mode:
                "HTML",
              reply_markup: {
                inline_keyboard: [
                  [
                    {
                      text:
                        "✅ دادن دسترسی",
                      callback_data:
                        `streamannounce_access_grant:${targetId}`
                    }
                  ],
                  [
                    {
                      text:
                        "❌ گرفتن دسترسی",
                      callback_data:
                        `streamannounce_access_revoke:${targetId}`
                    }
                  ],
                  [
                    {
                      text:
                        "🔙 لیست افراد",
                      callback_data:
                        "streamannounce_access_manage"
                    }
                  ],
                  [
                    {
                      text:
                        "🏠 منوی اصلی",
                      callback_data:
                        "home"
                    }
                  ]
                ]
              }
            }
          );
          await telegram(
            env,
            "answerCallbackQuery",
            {
              callback_query_id:
                callback.id
            }
          );
          return new Response("OK");
        }
        if (
          data.startsWith(
            "streamannounce_access_grant:"
          )
        ) {
          const targetId =
            Number(
              data.split(":")[1]
            );
          if (!targetId) {
            await telegram(
              env,
              "answerCallbackQuery",
              {
                callback_query_id:
                  callback.id,
                text:
                  "❌ اطلاعات کاربر نامعتبر است.",
                show_alert:
                  true
              }
            );
            return new Response("OK");
          }
          if (
            targetId ===
            Number(OWNER_ID)
          ) {
            await saveStreamAnnouncementAccess(
              env,
              targetId
            );
            await telegram(
              env,
              "answerCallbackQuery",
              {
                callback_query_id:
                  callback.id,
                text:
                  "✅ دسترسی Owner فعال است."
              }
            );
            return new Response("OK");
          }
          const members =
            await getStreamTimeMembers(
              env
            );
          if (
            !members.includes(
              targetId
            )
          ) {
            await telegram(
              env,
              "answerCallbackQuery",
              {
                callback_query_id:
                  callback.id,
                text:
                  "❌ فقط اعضای تأییدشده StreamTime می‌توانند دسترسی اعلام استریم بگیرند.",
                show_alert:
                  true
              }
            );
            return new Response("OK");
          }
          await saveStreamAnnouncementAccess(
            env,
            targetId
          );
          const profile =
            await getTelegramProfile(
              env,
              targetId
            );
          await telegram(
            env,
            "answerCallbackQuery",
            {
              callback_query_id:
                callback.id,
              text:
                "✅ دسترسی اعلام استریم داده شد."
            }
          );
          await telegram(
            env,
            "sendMessage",
            {
              chat_id:
                chatId,
              text:
                "✅ <b>دسترسی اعلام استریم فعال شد.</b>\n\n" +
                `${formatTelegramProfile(profile, targetId)}\n\n` +
                "این شخص اکنون می‌تواند از بخش «📣 اعلام استریم» استفاده کند.",
              parse_mode:
                "HTML",
              reply_markup: {
                inline_keyboard: [
                  [
                    {
                      text:
                        "❌ گرفتن دسترسی",
                      callback_data:
                        `streamannounce_access_revoke:${targetId}`
                    }
                  ],
                  [
                    {
                      text:
                        "🔙 لیست افراد",
                      callback_data:
                        "streamannounce_access_manage"
                    }
                  ]
                ]
              }
            }
          );
          return new Response("OK");
        }
        if (
          data.startsWith(
            "streamannounce_access_revoke:"
          )
        ) {
          const targetId =
            Number(
              data.split(":")[1]
            );
          if (!targetId) {
            await telegram(
              env,
              "answerCallbackQuery",
              {
                callback_query_id:
                  callback.id,
                text:
                  "❌ اطلاعات کاربر نامعتبر است.",
                show_alert:
                  true
              }
            );
            return new Response("OK");
          }
          if (
            targetId ===
            Number(OWNER_ID)
          ) {
            await telegram(
              env,
              "answerCallbackQuery",
              {
                callback_query_id:
                  callback.id,
                text:
                  "❌ دسترسی Owner قابل حذف نیست.",
                show_alert:
                  true
              }
            );
            return new Response("OK");
          }
          await deleteStreamAnnouncementAccess(
            env,
            targetId
          );
          const profile =
            await getTelegramProfile(
              env,
              targetId
            );
          await telegram(
            env,
            "answerCallbackQuery",
            {
              callback_query_id:
                callback.id,
              text:
                "❌ دسترسی اعلام استریم گرفته شد."
            }
          );
          await telegram(
            env,
            "sendMessage",
            {
              chat_id:
                chatId,
              text:
                "❌ <b>دسترسی اعلام استریم غیرفعال شد.</b>\n\n" +
                `${formatTelegramProfile(profile, targetId)}\n\n` +
                "این شخص دیگر نمی‌تواند از بخش «📣 اعلام استریم» استفاده کند.",
              parse_mode:
                "HTML",
              reply_markup: {
                inline_keyboard: [
                  [
                    {
                      text:
                        "✅ دادن دسترسی",
                      callback_data:
                        `streamannounce_access_grant:${targetId}`
                    }
                  ],
                  [
                    {
                      text:
                        "🔙 لیست افراد",
                      callback_data:
                        "streamannounce_access_manage"
                    }
                  ]
                ]
              }
            }
          );
          return new Response("OK");
        }
        if (
          data ===
          "user_access_manage"
        ) {
          await sendUnifiedUserAccessList(env, chatId);
          await telegram(env, "answerCallbackQuery", {
            callback_query_id: callback.id
          });
          return new Response("OK");
        }
        if (
          data.startsWith("user_access_select:")
        ) {
          const targetId = Number(data.split(":")[1]);
          await sendUnifiedUserAccessPanel(env, chatId, targetId);
          await telegram(env, "answerCallbackQuery", {
            callback_query_id: callback.id
          });
          return new Response("OK");
        }
        if (
          data.startsWith("user_access_toggle:")
        ) {
          const parts = data.split(":");
          const permission = parts[1];
          const targetId = Number(parts[2]);
          await toggleUnifiedUserAccess(env, chatId, targetId, permission);
          await telegram(env, "answerCallbackQuery", {
            callback_query_id: callback.id
          });
          return new Response("OK");
        }
        if (
          data ===
          "support_forum_manage"
        ) {
          await sendSupportForumManagementMenu(env, chatId);
          await telegram(env, "answerCallbackQuery", {
            callback_query_id: callback.id
          });
          return new Response("OK");
        }
        if (
          data ===
          "support_forum_set"
        ) {
          await saveAdminState(env, userId, {
            action: "support_forum_set",
            step: 1,
            data: {}
          });
          await telegram(env, "sendMessage", {
            chat_id: chatId,
            text:
              "💬 <b>تنظیم چت Support</b>\n\n" +
              "یک Supergroup که Topics آن فعال است بساز و بات را داخل آن ادمین کن.\n\n" +
              "بعد Chat ID گروه را بفرست.\n" +
              "مثال: <code>-1001234567890</code>",
            parse_mode: "HTML"
          });
          await telegram(env, "answerCallbackQuery", {
            callback_query_id: callback.id
          });
          return new Response("OK");
        }
        if (
          data ===
          "support_forum_disable"
        ) {
          if (Number(userId) !== Number(OWNER_ID)) {
            await telegram(env, "answerCallbackQuery", { callback_query_id: callback.id, text: "❌ فقط Owner می‌تواند Topics را غیرفعال کند.", show_alert: true });
            return new Response("OK");
          }
          if (!env.BOT_STATE) {
            await telegram(env, "answerCallbackQuery", { callback_query_id: callback.id, text: "ذخیره‌سازی تنظیم نشده است.", show_alert: true });
            return new Response("OK");
          }
          const activeForumId = await getSupportForumChatId(env);
          if (activeForumId) await env.BOT_STATE.put("support:forum:disabled_chat_id", String(activeForumId));
          await env.BOT_STATE.delete("support:forum:chat_id");
          await telegram(env, "sendMessage", {
            chat_id: chatId,
            text: "✅ سیستم Topicهای Support غیرفعال شد. تنظیم قبلی ذخیره شد؛ برای فعال‌سازی دوباره از دکمه فعال کردن Topics استفاده کن."
          });
          await telegram(env, "answerCallbackQuery", { callback_query_id: callback.id });
          return new Response("OK");
        }
        if (data === "support_forum_enable") {
          if (Number(userId) !== Number(OWNER_ID)) {
            await telegram(env, "answerCallbackQuery", { callback_query_id: callback.id, text: "❌ فقط Owner می‌تواند Topics را فعال کند.", show_alert: true });
            return new Response("OK");
          }
          if (!env.BOT_STATE) {
            await telegram(env, "answerCallbackQuery", { callback_query_id: callback.id, text: "ذخیره‌سازی تنظیم نشده است.", show_alert: true });
            return new Response("OK");
          }
          const savedForumId = await env.BOT_STATE.get("support:forum:disabled_chat_id");
          if (!savedForumId) {
            await telegram(env, "answerCallbackQuery", { callback_query_id: callback.id, text: "گروه قبلی ذخیره نشده؛ از تنظیم / تغییر چت Support استفاده کن.", show_alert: true });
            return new Response("OK");
          }
          const info = await telegram(env, "getChat", { chat_id: Number(savedForumId) });
          if (!(info && info.ok && info.result && info.result.type === "supergroup" && info.result.is_forum)) {
            await telegram(env, "answerCallbackQuery", { callback_query_id: callback.id, text: "گروه قبلی در دسترس نیست یا Topics آن فعال نیست؛ دوباره تنظیمش کن.", show_alert: true });
            return new Response("OK");
          }
          await saveSupportForumChatId(env, Number(savedForumId));
          await env.BOT_STATE.delete("support:forum:disabled_chat_id");
          await telegram(env, "sendMessage", { chat_id: chatId, text: "✅ سیستم Topicهای Support دوباره فعال شد." });
          await telegram(env, "answerCallbackQuery", { callback_query_id: callback.id });
          return new Response("OK");
        }
        if (
          data ===
          "support_admin_manage"
        ) {
          await deleteAdminState(
            env,
            userId
          );
          await sendSupportAdminManagementMenu(
            env,
            chatId
          );
          await telegram(
            env,
            "answerCallbackQuery",
            {
              callback_query_id:
                callback.id
            }
          );
          return new Response("OK");
        }
        if (
          data ===
          "support_admin_add"
        ) {
          await deleteAdminState(
            env,
            userId
          );
          await saveAdminState(
            env,
            userId,
            {
              action:
                "support_admin_add",
              step:
                1,
              data:
                {}
            }
          );
          await telegram(
            env,
            "sendMessage",
            {
              chat_id:
                chatId,
              text:
                "👮 <b>افزودن ادمین Support</b>\n\n" +
                "Telegram User ID شخص موردنظر را وارد کنید:\n\n" +
                "مثال:\n" +
                "1299357422",
              parse_mode:
                "HTML"
            }
          );
          await telegram(
            env,
            "answerCallbackQuery",
            {
              callback_query_id:
                callback.id
            }
          );
          return new Response("OK");
        }
        if (
          data ===
          "support_admin_remove"
        ) {
          await deleteAdminState(
            env,
            userId
          );
          await saveAdminState(
            env,
            userId,
            {
              action:
                "support_admin_remove",
              step:
                1,
              data:
                {}
            }
          );
          await telegram(
            env,
            "sendMessage",
            {
              chat_id:
                chatId,
              text:
                "➖ <b>حذف ادمین Support</b>\n\n" +
                "Telegram User ID ادمینی که می‌خواهی حذف شود را وارد کنید:",
              parse_mode:
                "HTML"
            }
          );
          await telegram(
            env,
            "answerCallbackQuery",
            {
              callback_query_id:
                callback.id
            }
          );
          return new Response("OK");
        }
        if (
          data ===
          "support_admin_list"
        ) {
          await sendSupportAdminList(
            env,
            chatId
          );
          await telegram(
            env,
            "answerCallbackQuery",
            {
              callback_query_id:
                callback.id
            }
          );
          return new Response("OK");
        }
        if (
          data ===
          "streamannounce_add"
        ) {
          await deleteAdminState(
            env,
            userId
          );
          await deleteStreamTimeState(
            env,
            userId
          );
          await deleteStreamAnnounceState(
            env,
            userId
          );
          await saveAdminState(
            env,
            userId,
            {
              action:
                "streamannounce_add",
              step:
                1,
              data:
                {}
            }
          );
          await telegram(
            env,
            "sendMessage",
            {
              chat_id:
                chatId,
              text:
                "➕ <b>افزودن مقصد اعلام استریم</b>\n\n" +
                "Chat ID گروه یا کانال را وارد کنید.\n\n" +
                "مثال گروه:\n" +
                "-1001234567890\n\n" +
                "برای کانال عمومی می‌توانی Username را هم وارد کنی:\n" +
                "@ChannelUsername\n\n" +
                "نکته: بات باید داخل مقصد عضو باشد و اجازه ارسال پیام داشته باشد.",
              parse_mode:
                "HTML"
            }
          );
          await telegram(
            env,
            "answerCallbackQuery",
            {
              callback_query_id:
                callback.id
            }
          );
          return new Response("OK");
        }
        if (
          data ===
          "streamannounce_remove"
        ) {
          await deleteAdminState(
            env,
            userId
          );
          await deleteStreamTimeState(
            env,
            userId
          );
          await deleteStreamAnnounceState(
            env,
            userId
          );
          await saveAdminState(
            env,
            userId,
            {
              action:
                "streamannounce_remove",
              step:
                1,
              data:
                {}
            }
          );
          await telegram(
            env,
            "sendMessage",
            {
              chat_id:
                chatId,
              text:
                "➖ <b>حذف مقصد اعلام استریم</b>\n\n" +
                "Chat ID مقصدی که می‌خواهی حذف شود را وارد کن.\n\n" +
                "مثال:\n" +
                "-1001234567890",
              parse_mode:
                "HTML"
            }
          );
          await telegram(
            env,
            "answerCallbackQuery",
            {
              callback_query_id:
                callback.id
            }
          );
          return new Response("OK");
        }
        if (
          data ===
          "streamannounce_list"
        ) {
          await sendStreamAnnounceChats(
            env,
            chatId
          );
          await telegram(
            env,
            "answerCallbackQuery",
            {
              callback_query_id:
                callback.id
            }
          );
          return new Response("OK");
        }
        if (
          data ===
          "streamannounce_test"
        ) {
          const result =
            await sendStreamAnnounceTest(
              env
            );
          let resultText =
            "🧪 <b>تست ارسال اعلام استریم</b>\n\n" +
            `📢 تعداد مقصدها: ${result.total}\n` +
            `✅ موفق: ${result.success}\n` +
            `❌ ناموفق: ${result.failed}`;
          if (
            result.failedItems.length > 0
          ) {
            resultText +=
              "\n\n❌ مقصدهای ناموفق:\n";
            for (
              const item of result.failedItems
            ) {
              resultText +=
                `• ${escapeHtml(item.title)}\n`;
            }
          }
          await telegram(
            env,
            "sendMessage",
            {
              chat_id:
                chatId,
              text:
                resultText,
              parse_mode:
                "HTML",
              reply_markup: {
                inline_keyboard: [
                  [
                    {
                      text:
                        "🔄 تست دوباره",
                      callback_data:
                        "streamannounce_test"
                    }
                  ],
                  [
                    {
                      text:
                        "🔙 مدیریت اعلام استریم",
                      callback_data:
                        "streamannounce_manage"
                    }
                  ]
                ]
              }
            }
          );
          await telegram(
            env,
            "answerCallbackQuery",
            {
              callback_query_id:
                callback.id
            }
          );
          return new Response("OK");
        }
        if (
          data ===
          "streamtime_add"
        ) {
          await deleteStreamTimeState(
            env,
            userId
          );
          await deleteStreamAnnounceState(
            env,
            userId
          );
          await saveAdminState(
            env,
            userId,
            {
              action:
                "add",
              step:
                1,
              data:
                {}
            }
          );
          await telegram(
            env,
            "sendMessage",
            {
              chat_id:
                chatId,
              text:
                "➕ افزودن عضو\n\n" +
                "مرحله 1 از 3\n\n" +
                "اسم گیم / نام نمایشی این عضو را وارد کن.\n" +
                "این اسم در فهرست‌ها نمایش داده می‌شود و با اسم تلگرام فرق دارد."
            }
          );
          await telegram(
            env,
            "answerCallbackQuery",
            {
              callback_query_id:
                callback.id
            }
          );
          return new Response("OK");
        }
        if (
          data ===
          "streamtime_remove"
        ) {
          await deleteStreamTimeState(env, userId);
          await deleteStreamAnnounceState(env, userId);
          await deleteAdminState(env, userId);
          await sendStreamTimeMemberRemovalPicker(env, chatId);
          await telegram(env, "answerCallbackQuery", { callback_query_id: callback.id });
          return new Response("OK");
        }
        if (
          data ===
          "streamtime_list"
        ) {
          await sendStreamTimeMembers(
            env,
            chatId
          );
          await telegram(
            env,
            "answerCallbackQuery",
            {
              callback_query_id:
                callback.id
            }
          );
          return new Response("OK");
        }
        if (
          data ===
          "streamtime_total"
        ) {
          await deleteStreamTimeState(
            env,
            userId
          );
          await deleteStreamAnnounceState(
            env,
            userId
          );
          await saveAdminState(
            env,
            userId,
            {
              action:
                "total"
            }
          );
          await telegram(
            env,
            "sendMessage",
            {
              chat_id:
                chatId,
              text:
                "⏱️ تایم یک عضو\n\n" +
                "Telegram User ID را وارد کنید:"
            }
          );
          await telegram(
            env,
            "answerCallbackQuery",
            {
              callback_query_id:
                callback.id
            }
          );
          return new Response("OK");
        }
        if (
          data ===
          "streamtime_referral"
        ) {
          await deleteStreamTimeState(
            env,
            userId
          );
          await deleteStreamAnnounceState(
            env,
            userId
          );
          await saveAdminState(
            env,
            userId,
            {
              action:
                "referral",
              step:
                1,
              data:
                {}
            }
          );
          await telegram(
            env,
            "sendMessage",
            {
              chat_id:
                chatId,
              text:
                "🎫 ثبت / تغییر Referral\n\n" +
                "Telegram User ID شخص موردنظر را وارد کنید:"
            }
          );
          await telegram(
            env,
            "answerCallbackQuery",
            {
              callback_query_id:
                callback.id
            }
          );
          return new Response("OK");
        }
        if (data === "streamtime_reset_all" || data === "streamtime_reset_confirm") {
          await telegram(env, "answerCallbackQuery", { callback_query_id: callback.id });
          await telegram(env, "sendMessage", { chat_id: chatId, text: "⚠️ <b>ریست تایم و تعداد استریم</b>\n\nفقط مجموع تایم، تعداد استریم و زمان آخرین فعالیت اعضا صفر می‌شود.\n⭐ امتیازها، نمره ارزیابی و آمار مادام‌العمر حفظ می‌شوند.", parse_mode: "HTML", reply_markup: { inline_keyboard: [[{ text: "✅ بله، فقط تایم ریست شود", callback_data: "team_reset_do" }], [{ text: "❌ لغو", callback_data: "team_dashboard" }]] } });
          return new Response("OK");
        }

        if (
          data ===
          "streamtime_payment"
        ) {
          await deleteAdminState(env, userId);
          await sendWeeklyPaymentMembers(env, chatId);
          await telegram(
            env,
            "answerCallbackQuery",
            {
              callback_query_id:
                callback.id
            }
          );
          return new Response("OK");
        }
        if (data === "streamtime_weekly_payment") {
          await deleteAdminState(env, userId);
          await sendWeeklyPaymentMembers(env, chatId);
          await telegram(
            env,
            "answerCallbackQuery",
            {
              callback_query_id:
                callback.id
            }
          );
          return new Response("OK");
        }
        if (data.startsWith("weekly_payment_member:")) {
          const targetId =
            Number(
              data.split(":")[1]
            );
          const members =
            await getStreamTimeMembers(
              env
            );
          if (
            !targetId ||
            !members.includes(targetId)
          ) {
            await telegram(
              env,
              "answerCallbackQuery",
              {
                callback_query_id:
                  callback.id,
                text:
                  "❌ این کاربر در لیست اعضا نیست.",
                show_alert:
                  true
              }
            );
            return new Response("OK");
          }
          const existingPayment = await env.BOT_STATE.get(`team:payment:${targetId}`, "json");
          if (existingPayment && existingPayment.week === getPaymentWeekKey() && existingPayment.paid === true) {
            await telegram(env, "answerCallbackQuery", { callback_query_id: callback.id, text: "حقوق این عضو برای هفته جاری قبلاً ثبت و تأیید شده است. برای تغییر، ابتدا از بخش اصلاح / حذف حقوق استفاده کن.", show_alert: true });
            return new Response("OK");
          }
          await saveAdminState(
            env,
            userId,
            {
              action:
                "payment_salary_setup",
              step:
                1,
              data: {
                userId:
                  targetId,
                money:
                  null,
                gold:
                  null,
                token:
                  null
              }
            }
          );
          const profile =
            await getTelegramProfile(
              env,
              targetId
            );
          await telegram(
            env,
            "sendMessage",
            {
              chat_id:
                chatId,
              text:
                "💰 <b>ثبت حقوق هفتگی</b>\n\n" +
                `${formatTelegramProfile(profile, targetId)}\n\n` +
                "مرحله 1 از 3\n\n" +
                "💵 مبلغ <b>پول بازی</b> را وارد کن:\n" +
                "اگر این گزینه پرداخت نمی‌شود، <b>0</b> وارد کن.",
              parse_mode:
                "HTML",
              reply_markup: {
                inline_keyboard: [
                  [
                    {
                      text:
                        "🔙 انتخاب عضو",
                      callback_data:
                        "streamtime_weekly_payment"
                    }
                  ],
                  [
                    {
                      text:
                        "🏠 منوی اصلی",
                      callback_data:
                        "home"
                    }
                  ]
                ]
              }
            }
          );
          await telegram(
            env,
            "answerCallbackQuery",
            {
              callback_query_id:
                callback.id
            }
          );
          return new Response("OK");
        }
        if (data === "payment_list") {
          await sendPaymentList(
            env,
            chatId
          );
          await telegram(
            env,
            "answerCallbackQuery",
            {
              callback_query_id:
                callback.id
            }
          );
          return new Response("OK");
        }
        if (data === "streamtime_member_stats") {
          await sendStreamTimeMemberStats(
            env,
            chatId
          );
          await telegram(
            env,
            "answerCallbackQuery",
            {
              callback_query_id:
                callback.id
            }
          );
          return new Response("OK");
        }
        if (data.startsWith("payment_member:")) {
          const targetId = Number(data.split(":")[1]);
          const members = await getStreamTimeMembers(env);
          if (!targetId || !members.includes(targetId)) {
            await telegram(env, "answerCallbackQuery", { callback_query_id: callback.id, text: "❌ این کاربر در لیست اعضا نیست.", show_alert: true });
            return new Response("OK");
          }
          const existingPayment = await env.BOT_STATE.get(`team:payment:${targetId}`, "json");
          if (existingPayment && existingPayment.week === getPaymentWeekKey() && existingPayment.paid === true) {
            await telegram(env, "answerCallbackQuery", { callback_query_id: callback.id, text: "حقوق این عضو برای هفته جاری قبلاً ثبت شده است؛ برای تغییر از بخش اصلاح / حذف حقوق استفاده کن.", show_alert: true });
            return new Response("OK");
          }
          await saveAdminState(env, userId, { action: "payment_salary_setup", step: 1, data: { userId: targetId, money: null, gold: null, token: null } });
          const profile = await getTelegramProfile(env, targetId);
          await telegram(env, "sendMessage", { chat_id: chatId, text: `💰 <b>ثبت حقوق این هفته</b>\n\n${formatTelegramProfile(profile, targetId)}\n\nمرحله 1 از 3\n💵 مبلغ پول بازی را وارد کن؛ اگر پرداخت نمی‌شود 0 بفرست.`, parse_mode: "HTML", reply_markup: { inline_keyboard: [[{ text: "🔙 انتخاب عضو", callback_data: "streamtime_weekly_payment" }], [{ text: "🏠 منوی اصلی", callback_data: "home" }]] } });
          await telegram(env, "answerCallbackQuery", { callback_query_id: callback.id });
          return new Response("OK");
        }
        if (
          data ===
          "payment_salary"
        ) {
          const state =
            await getAdminState(
              env,
              userId
            );
          const targetId =
            Number(
              state?.data?.userId
            );
          if (
            state?.action !== "payment" ||
            !targetId
          ) {
            await telegram(
              env,
              "answerCallbackQuery",
              {
                callback_query_id:
                  callback.id,
                text:
                  "❌ اطلاعات پرداخت پیدا نشد. دوباره تلاش کنید.",
                show_alert:
                  true
              }
            );
            return new Response("OK");
          }
          const members =
            await getStreamTimeMembers(
              env
            );
          if (
            !members.includes(
              targetId
            )
          ) {
            await deleteAdminState(
              env,
              userId
            );
            await telegram(
              env,
              "answerCallbackQuery",
              {
                callback_query_id:
                  callback.id,
                text:
                  "❌ این کاربر دیگر عضو StreamTime نیست.",
                show_alert:
                  true
              }
            );
            return new Response("OK");
          }
          const paymentText =
            "💵 حقوق این ماه شما واریز شد.\n\n" +
            "با تشکر از همکاری شما ❤️";
          const result =
            await telegram(
              env,
              "sendMessage",
              {
                chat_id:
                  targetId,
                text:
                  paymentText
              }
            );
          await deleteAdminState(
            env,
            userId
          );
          if (
            result &&
            result.ok
          ) {
            await telegram(
              env,
              "answerCallbackQuery",
              {
                callback_query_id:
                  callback.id,
                text:
                  "✅ پیام حقوق برای کاربر ارسال شد."
              }
            );
            await telegram(
              env,
              "sendMessage",
              {
                chat_id:
                  chatId,
                text:
                  "✅ <b>اعلام پرداخت انجام شد.</b>\n\n" +
                  `🆔 User ID: ${targetId}\n\n` +
                  "💵 حقوق این ماه برای کاربر ارسال شد.",
                parse_mode:
                  "HTML"
              }
            );
          } else {
            await telegram(
              env,
              "answerCallbackQuery",
              {
                callback_query_id:
                  callback.id,
                text:
                  "❌ ارسال پیام انجام نشد.",
                show_alert:
                  true
              }
            );
          }
          return new Response("OK");
        }
        if (
          data ===
          "payment_bonus"
        ) {
          const state =
            await getAdminState(
              env,
              userId
            );
          const targetId =
            Number(
              state?.data?.userId
            );
          if (
            state?.action !== "payment" ||
            !targetId
          ) {
            await telegram(
              env,
              "answerCallbackQuery",
              {
                callback_query_id:
                  callback.id,
                text:
                  "❌ اطلاعات پرداخت پیدا نشد. دوباره تلاش کنید.",
                show_alert:
                  true
              }
            );
            return new Response("OK");
          }
          const members =
            await getStreamTimeMembers(
              env
            );
          if (
            !members.includes(
              targetId
            )
          ) {
            await deleteAdminState(
              env,
              userId
            );
            await telegram(
              env,
              "answerCallbackQuery",
              {
                callback_query_id:
                  callback.id,
                text:
                  "❌ این کاربر دیگر عضو StreamTime نیست.",
                show_alert:
                  true
              }
            );
            return new Response("OK");
          }
          const paymentText =
            "🎁 پاداش شما واریز شد.\n\n" +
            "ممنون بابت فعالیت و همکاری شما ❤️";
          const result =
            await telegram(
              env,
              "sendMessage",
              {
                chat_id:
                  targetId,
                text:
                  paymentText
              }
            );
          await deleteAdminState(
            env,
            userId
          );
          if (
            result &&
            result.ok
          ) {
            await telegram(
              env,
              "answerCallbackQuery",
              {
                callback_query_id:
                  callback.id,
                text:
                  "✅ پیام پاداش برای کاربر ارسال شد."
              }
            );
            await telegram(
              env,
              "sendMessage",
              {
                chat_id:
                  chatId,
                text:
                  "✅ <b>اعلام پرداخت انجام شد.</b>\n\n" +
                  `🆔 User ID: ${targetId}\n\n` +
                  "🎁 پیام پاداش برای کاربر ارسال شد.",
                parse_mode:
                  "HTML"
              }
            );
          } else {
            await telegram(
              env,
              "answerCallbackQuery",
              {
                callback_query_id:
                  callback.id,
                text:
                  "❌ ارسال پیام انجام نشد.",
                show_alert:
                  true
              }
            );
          }
          return new Response("OK");
        }
        if (
          data ===
          "payment_custom"
        ) {
          const state =
            await getAdminState(
              env,
              userId
            );
          const targetId =
            Number(
              state?.data?.userId
            );
          if (
            state?.action !== "payment" ||
            !targetId
          ) {
            await telegram(
              env,
              "answerCallbackQuery",
              {
                callback_query_id:
                  callback.id,
                text:
                  "❌ اطلاعات کاربر پیدا نشد. دوباره تلاش کنید.",
                show_alert:
                  true
              }
            );
            return new Response("OK");
          }
          state.step =
            3;
          await saveAdminState(
            env,
            userId,
            state
          );
          await telegram(
            env,
            "sendMessage",
            {
              chat_id:
                chatId,
              text:
                "✏️ <b>پیام دلخواه</b>\n\n" +
                "متنی که می‌خواهی برای این کاربر ارسال شود را بنویس:",
              parse_mode:
                "HTML"
            }
          );
          await telegram(
            env,
            "answerCallbackQuery",
            {
              callback_query_id:
                callback.id
            }
          );
          return new Response("OK");
        }
        if (
          data ===
          "broadcast_all"
        ) {
          await deleteAdminState(
            env,
            userId
          );
          await deleteStreamTimeState(
            env,
            userId
          );
          await deleteStreamAnnounceState(
            env,
            userId
          );
          await saveAdminState(
            env,
            userId,
            {
              action:
                "broadcast",
              step:
                1
            }
          );
          await telegram(
            env,
            "sendMessage",
            {
              chat_id:
                chatId,
              text:
                "📣 <b>پیام همگانی</b>\n\n" +
                "متنی که می‌خواهی برای تمام کاربرانی که بات را Start کرده‌اند ارسال شود، وارد کن:\n\n" +
                "مثال:\n" +
                "🎉 اطلاعیه جدید\n" +
                "امروز ساعت 20:00 برنامه ویژه داریم.",
              parse_mode:
                "HTML"
            }
          );
          await telegram(
            env,
            "answerCallbackQuery",
            {
              callback_query_id:
                callback.id
            }
          );
          return new Response("OK");
        }
        if (
          data ===
          "streamtime_users_count"
        ) {
          await sendBotUserCount(
            env,
            chatId
          );
          await telegram(
            env,
            "answerCallbackQuery",
            {
              callback_query_id:
                callback.id
            }
          );
          return new Response("OK");
        }
        if (
          data ===
          "payment_back_members"
        ) {
          await deleteAdminState(env, userId);
          await sendWeeklyPaymentMembers(env, chatId);
          await telegram(
            env,
            "answerCallbackQuery",
            {
              callback_query_id:
                callback.id
            }
          );
          return new Response("OK");
        }
        await telegram(
          env,
          "answerCallbackQuery",
          {
            callback_query_id:
              callback.id
          }
        );
        return new Response("OK");
      }
      if (!update.message) {
        return new Response("OK");
      }
      const message =
        update.message;
      const chatId =
        message.chat.id;
      const userId =
        message.from.id;
      const text =
        message.text
          ? message.text.trim()
          : "";
      await saveTelegramProfile(
        env,
        message.from
      );
      const reviewGroupCommand = text.split(/\s+/)[0].split("@")[0].toLowerCase();
      if (reviewGroupCommand === "/setstreamreviewgroup" && Number(userId) === Number(OWNER_ID)) {
        if (message.chat.type === "private") {
          await telegram(env, "sendMessage", { chat_id: chatId, text: "❌ این دستور را داخل گروهی بفرست که می‌خواهی پیام ارزیابی لایوها در آن منتشر شود." });
        } else {
          await env.BOT_STATE.put("streamreview:group_id", String(chatId));
          await env.BOT_STATE.put("streamreview:group_title", String(message.chat.title || "گروه ارزیابی"));
          await telegram(env, "sendMessage", { chat_id: chatId, text: "✅ این گروه به‌عنوان گروه ارزیابی لایوها ثبت شد. از این به بعد با هر اعلام لایو، پیام ارزیابی و دکمه‌های امتیازدهی همین‌جا منتشر می‌شود. همه اعضای گروه می‌توانند ارزیابی ثبت کنند؛ نیازی به افزودن دستی ارزیاب نیست." });
        }
        return new Response("OK");
      }
      const enhancedMessageHandled = await handleEnhancedMessage(env, message);
      if (enhancedMessageHandled) {
        return new Response("OK");
      }
      const command =
        text
          .split(/\s+/)[0]
          .split("@")[0]
          .toLowerCase();
      if (
        (
          command ===
            "/setstreamgroup" ||
          command ===
            "/addstreamgroup"
        ) &&
        Number(userId) ===
        Number(OWNER_ID)
      ) {
        if (
          message.chat.type ===
            "private"
        ) {
          await telegram(
            env,
            "sendMessage",
            {
              chat_id:
                chatId,
              text:
                "❌ این دستور را باید داخل همان گروهی که می‌خواهی اعلام استریم‌ها آنجا ارسال شوند بفرستی."
            }
          );
          return new Response("OK");
        }
        const targetTitle =
          message.chat.title ||
          "مقصد بدون نام";
        const targetType =
          message.chat.type ||
          "unknown";
        const result =
          await addStreamAnnounceChat(
            env,
            chatId,
            targetTitle,
            targetType
          );
        if (
          result.added
        ) {
          await telegram(
            env,
            "sendMessage",
            {
              chat_id:
                chatId,
              text:
                "✅ <b>این گروه با موفقیت به مقصدهای اعلام استریم اضافه شد.</b>\n\n" +
                `📢 ${escapeHtml(targetTitle)}\n` +
                `🆔 ${chatId}\n` +
                `📌 نوع: ${escapeHtml(targetType)}\n\n` +
                "از این به بعد هر اعلام استریم در تمام مقصدهای ثبت‌شده ارسال می‌شود.",
              parse_mode:
                "HTML"
            }
          );
        } else {
          await telegram(
            env,
            "sendMessage",
            {
              chat_id:
                chatId,
              text:
                "ℹ️ این گروه قبلاً در لیست مقصدهای اعلام استریم ثبت شده است.\n\n" +
                `📢 ${targetTitle}\n` +
                `🆔 ${chatId}`
            }
          );
        }
        return new Response("OK");
      }
      if (
        command ===
        "/removestreamgroup" &&
        Number(userId) ===
        Number(OWNER_ID)
      ) {
        if (
          message.chat.type ===
            "private"
        ) {
          await telegram(
            env,
            "sendMessage",
            {
              chat_id:
                chatId,
              text:
                "❌ این دستور را باید داخل همان گروهی که می‌خواهی حذف شود بفرستی."
            }
          );
          return new Response("OK");
        }
        const removed =
          await removeStreamAnnounceChat(
            env,
            chatId
          );
        if (
          removed
        ) {
          await telegram(
            env,
            "sendMessage",
            {
              chat_id:
                chatId,
              text:
                "✅ این گروه از لیست مقصدهای اعلام استریم حذف شد."
            }
          );
        } else {
          await telegram(
            env,
            "sendMessage",
            {
              chat_id:
                chatId,
              text:
                "ℹ️ این گروه در لیست مقصدهای اعلام استریم وجود نداشت."
            }
          );
        }
        return new Response("OK");
      }
      const supportForumChatId =
        await getSupportForumChatId(env);
      if (
        supportForumChatId &&
        Number(message.chat.id) ===
        Number(supportForumChatId)
      ) {
        await handleSupportForumMessage(env, message);
        return new Response("OK");
      }
      if (
        message.chat.type !==
        "private"
      ) {
        return new Response("OK");
      }
      const supportAdmin =
        await isSupportAdmin(
          env,
          userId
        );
      if (
        (
          Number(userId) ===
          Number(OWNER_ID)
        ) ||
        supportAdmin
      ) {
        if (
          message.reply_to_message
        ) {
          const replied =
            message.reply_to_message;
          const repliedText =
            replied.text ||
            replied.caption ||
            "";
          const match =
            repliedText.match(
              /🆔 User ID:\s*(\d+)/
            );
          if (match) {
            const targetUserId =
              Number(
                match[1]
              );
            const adminProfile =
              await getTelegramProfile(
                env,
                userId
              );
            const adminName =
              getPublicUserName(
                adminProfile,
                userId
              );
            if (
              message.text
            ) {
              const sendResult =
                await telegram(
                  env,
                  "sendMessage",
                  {
                    chat_id:
                      targetUserId,
                    text:
                      "📩 پاسخ Support:\n\n" +
                      message.text
                  }
                );
              if (
                !(
                  sendResult &&
                  sendResult.ok
                )
              ) {
                await telegram(
                  env,
                  "sendMessage",
                  {
                    chat_id:
                      chatId,
                    text:
                      "❌ ارسال پاسخ به کاربر انجام نشد."
                  }
                );
                return new Response(
                  "OK"
                );
              }
              if (
                supportAdmin
              ) {
                await telegram(
                  env,
                  "sendMessage",
                  {
                    chat_id:
                      OWNER_ID,
                    text:
                      "👮 <b>پاسخ ادمین Support</b>\n\n" +
                      `👤 ادمین: ${escapeHtml(adminName)}\n` +
                      `🆔 Admin ID: ${userId}\n\n` +
                      `👤 کاربر: ${targetUserId}\n\n` +
                      "💬 پاسخ ارسال‌شده:\n" +
                      escapeHtml(message.text),
                    parse_mode:
                      "HTML"
                  }
                );
              }
              await telegram(
                env,
                "sendMessage",
                {
                  chat_id:
                    chatId,
                  text:
                    "✅ پاسخ برای کاربر ارسال شد." +
                    (
                      supportAdmin
                        ? "\n✅ گزارش پاسخ برای Owner ارسال شد."
                        : ""
                    )
                }
              );
              return new Response(
                "OK"
              );
            }
            if (
              message.photo ||
              message.video ||
              message.document ||
              message.voice
            ) {
              const sendResult =
                await telegram(
                  env,
                  "copyMessage",
                  {
                    chat_id:
                      targetUserId,
                    from_chat_id:
                      chatId,
                    message_id:
                      message.message_id
                  }
                );
              if (
                !(
                  sendResult &&
                  sendResult.ok
                )
              ) {
                await telegram(
                  env,
                  "sendMessage",
                  {
                    chat_id:
                      chatId,
                    text:
                      "❌ ارسال رسانه برای کاربر انجام نشد."
                  }
                );
                return new Response(
                  "OK"
                );
              }
              if (
                supportAdmin
              ) {
                await telegram(
                  env,
                  "sendMessage",
                  {
                    chat_id:
                      OWNER_ID,
                    text:
                      "👮 <b>پاسخ ادمین Support</b>\n\n" +
                      `👤 ادمین: ${escapeHtml(adminName)}\n` +
                      `🆔 Admin ID: ${userId}\n\n` +
                      `👤 کاربر: ${targetUserId}\n\n` +
                      "📎 ادمین یک فایل/رسانه به عنوان پاسخ ارسال کرد.",
                    parse_mode:
                      "HTML"
                  }
                );
                await telegram(
                  env,
                  "copyMessage",
                  {
                    chat_id:
                      OWNER_ID,
                    from_chat_id:
                      chatId,
                    message_id:
                      message.message_id
                  }
                );
              }
              await telegram(
                env,
                "sendMessage",
                {
                  chat_id:
                    chatId,
                  text:
                    "✅ پاسخ برای کاربر ارسال شد." +
                    (
                      supportAdmin
                        ? "\n✅ گزارش پاسخ برای Owner ارسال شد."
                        : ""
                    )
                }
              );
              return new Response(
                "OK"
              );
            }
          }
        }
      }
      if (
        command ===
        "/start"
      ) {
        await saveBotUser(
          env,
          userId
        );
        await deleteAdminState(
          env,
          userId
        );
        await deleteStreamTimeState(
          env,
          userId
        );
        await deleteStreamAnnounceState(
          env,
          userId
        );
        await sendMainMenu(
          env,
          chatId
        );
        return new Response("OK");
      }
      if (
        text ===
        "🎥 Support Streamer"
      ) {
        await deleteAdminState(
          env,
          userId
        );
        await deleteStreamTimeState(
          env,
          userId
        );
        await deleteStreamAnnounceState(
          env,
          userId
        );
        await telegram(
          env,
          "sendMessage",
          {
            chat_id:
              chatId,
            text:
              "🎥 Support Streamer\n\n" +
              "پیام خود را ارسال کنید تا برای ادمین ارسال شود."
          }
        );
        return new Response("OK");
      }
      if (
        text ===
        "⏰ StreamTime"
      ) {
        const allowed =
          await isAllowedStreamTime(
            env,
            userId
          );
        if (!allowed) {
          await telegram(
            env,
            "sendMessage",
            {
              chat_id:
                chatId,
              text:
                "❌ شما اجازه ثبت StreamTime را ندارید."
            }
          );
          return new Response("OK");
        }
        await deleteAdminState(
          env,
          userId
        );
        await deleteStreamAnnounceState(
          env,
          userId
        );
        await deleteStreamTimeState(
          env,
          userId
        );
        await startStreamTime(
          env,
          chatId,
          userId
        );
        return new Response("OK");
      }
      if (
        text ===
        "📢 Trial Streamer"
      ) {
        await deleteAdminState(
          env,
          userId
        );
        await deleteStreamTimeState(
          env,
          userId
        );
        await deleteStreamAnnounceState(
          env,
          userId
        );
        await telegram(
          env,
          "sendMessage",
          {
            chat_id:
              chatId,
            text:
              ADS_TEXT
          }
        );
        return new Response("OK");
      }

      if (
        text ===
        "📣 اعلام استریم"
      ) {
        const allowed =
          await isAllowedStreamAnnouncement(
            env,
            userId
          );
        if (!allowed) {
          await telegram(
            env,
            "sendMessage",
            {
              chat_id:
                chatId,
              text:
                "❌ شما اجازه اعلام استریم ندارید."
            }
          );
          return new Response("OK");
        }
        await deleteAdminState(
          env,
          userId
        );
        await deleteStreamTimeState(
          env,
          userId
        );
        await startStreamAnnouncement(
          env,
          chatId,
          userId
        );
        return new Response("OK");
      }
      if (
        text ===
        "📜 قوانین"
      ) {
        await deleteAdminState(
          env,
          userId
        );
        await deleteStreamTimeState(
          env,
          userId
        );
        await deleteStreamAnnounceState(
          env,
          userId
        );
        await telegram(
          env,
          "sendMessage",
          {
            chat_id:
              chatId,
            text:
              RULES_TEXT
          }
        );
        return new Response("OK");
      }
      if (
        Number(userId) ===
        Number(OWNER_ID) &&
        text ===
        "👥 مدیریت اعضای StreamTime"
      ) {
        await deleteAdminState(
          env,
          userId
        );
        await deleteStreamTimeState(
          env,
          userId
        );
        await deleteStreamAnnounceState(
          env,
          userId
        );
        await sendStreamTimeManagementMenu(
          env,
          chatId
        );
        return new Response("OK");
      }
      if (
        Number(userId) ===
        Number(OWNER_ID)
      ) {
        const adminState =
          await getAdminState(
            env,
            userId
          );
        if (adminState) {
          const handled =
            await handleAdminState(
              env,
              message,
              adminState
            );
          if (handled) {
            return new Response("OK");
          }
        }
      }
      const streamAllowed =
        await isAllowedStreamTime(
          env,
          userId
        );
      if (streamAllowed) {
        const streamState =
          await getStreamTimeState(
            env,
            userId
          );
        if (streamState) {
          await handleStreamTimeStep(
            env,
            message,
            streamState
          );
          return new Response("OK");
        }
      }
      const announceAllowed =
        await isAllowedStreamAnnouncement(
          env,
          userId
        );
      if (announceAllowed) {
        const announceState =
          await getStreamAnnounceState(
            env,
            userId
          );
        if (announceState) {
          await handleStreamAnnouncementStep(
            env,
            message,
            announceState
          );
          return new Response("OK");
        }
      }
      if (
        message.chat.type ===
          "private" &&
        Number(userId) !==
        Number(OWNER_ID)
      ) {
        await sendSupportMessage(
          env,
          message
        );
        await telegram(
          env,
          "sendMessage",
          {
            chat_id:
              chatId,
            text:
              "✅ پیام شما برای ادمین ارسال شد.\n\n" +
              "در صورت نیاز ادمین از طریق همین ربات به شما پاسخ می‌دهد."
          }
        );
        return new Response("OK");
      }
      return new Response("OK");
    } catch (error) {
      console.log(
        "ERROR:",
        error
      );
      return new Response("OK");
    }
  }
};
async function sendMainMenu(
  env,
  chatId
) {
  const userId = Number(chatId);
  const keyboard = [
    [{ text: "🎥 Support Streamer" }],
    [{ text: "📢 Trial Streamer" }],
    [{ text: "📜 قوانین" }],
    [{ text: "🏆 رتبه‌بندی" }]
  ];
  const owner = userId === Number(OWNER_ID);
  const streamtime = owner || (await getStreamTimeMembers(env)).includes(userId);
  const profile = owner || await isAllowedProfile(env, userId);
  const announce = owner || await isAllowedStreamAnnouncement(env, userId);
  if (streamtime) keyboard.push([{ text: "⏰ StreamTime" }]);
  if (profile) keyboard.push([{ text: "👤 پروفایل من" }]);
  if (announce) keyboard.push([{ text: "📣 اعلام استریم" }]);
  if (owner) {
    keyboard.push([{ text: "👑 مدیریت تیم و اعضا" }]);
  }
  await telegram(env, "sendMessage", {
    chat_id: chatId,
    text: MENU_TEXT,
    reply_markup: { keyboard, resize_keyboard: true }
  });
}

async function sendManualStreamMemberPicker(env, chatId, action) {
  const members = await getStreamTimeMembers(env);
  const rows = [];
  for (const id of members) {
    const profile = await getTelegramProfile(env, id);
    rows.push([{ text: getPublicUserName(profile, id), callback_data: `manual_stream_member:${action}:${id}` }]);
  }
  if (!rows.length) {
    await telegram(env, "sendMessage", { chat_id: chatId, text: "❌ هنوز هیچ عضو ثبت‌شده‌ای وجود ندارد.", reply_markup: { inline_keyboard: [[{ text: "🔙 مدیریت StreamTime", callback_data: "streamtime_manage" }]] } });
    return;
  }
  rows.push([{ text: "🔙 مدیریت StreamTime", callback_data: "streamtime_manage" }]);
  await telegram(env, "sendMessage", {
    chat_id: chatId,
    text: action === "add" ? "➕ <b>انتخاب عضو برای ثبت StreamTime</b>" : "➖ <b>انتخاب عضو برای حذف StreamTime</b>",
    parse_mode: "HTML",
    reply_markup: { inline_keyboard: rows }
  });
}
async function sendStreamTimeMemberRemovalPicker(env, chatId) {
  const members = await getStreamTimeMembers(env);
  const rows = [];
  for (const id of members) {
    if (Number(id) === Number(OWNER_ID)) continue;
    const profile = await getTelegramProfile(env, id);
    rows.push([{ text: `➖ ${getPublicUserName(profile, id)}`, callback_data: `streamtime_remove_pick:${id}` }]);
  }
  if (!rows.length) {
    await telegram(env, "sendMessage", { chat_id: chatId, text: "❌ عضوی برای حذف پیدا نشد.", reply_markup: { inline_keyboard: [[{ text: "➕ افزودن عضو", callback_data: "streamtime_add" }], [{ text: "🔙 مدیریت اعضا", callback_data: "streamtime_menu_members" }]] } });
    return;
  }
  rows.push([{ text: "🔙 مدیریت اعضا", callback_data: "streamtime_menu_members" }]);
  await telegram(env, "sendMessage", { chat_id: chatId, text: "➖ <b>انتخاب عضو برای حذف</b>\n\nروی نام فرد بزن؛ قبل از حذف، تأیید نهایی نمایش داده می‌شود.", parse_mode: "HTML", reply_markup: { inline_keyboard: rows } });
}

async function promptTeamTrialDuration(env, chatId, targetId) {
  const members = await getStreamTimeMembers(env);
  if (!Number(targetId) || !members.includes(Number(targetId))) {
    await telegram(env, "sendMessage", { chat_id: chatId, text: "❌ این شخص عضو StreamTime نیست." });
    return;
  }
  await env.BOT_STATE.put(`team:trial_duration_state:${chatId}`, JSON.stringify({ targetId: Number(targetId), startedAt: Date.now() }), { expirationTtl: 900 });
  const profile = await getTelegramProfile(env, targetId);
  const stats = await getTeamStats(env, targetId);
  const activeTrial = stats.status === "Trial" && Number(stats.trialUntil || 0) > Date.now();
  await telegram(env, "sendMessage", { chat_id: chatId, text: `🟡 <b>تعیین مدت Trial</b>\n\n👤 ${escapeHtml(getPublicUserName(profile, targetId))}\n${activeTrial ? `📅 پایان فعلی: <b>${new Date(Number(stats.trialUntil)).toLocaleDateString("en-GB")}</b>\n` : ""}\nتعداد روزهای Trial را به صورت عدد وارد کن.\nمثال: <b>7</b> یا <b>45</b>\n\nحداقل ۱ و حداکثر ۳۶۵۰ روز.`, parse_mode: "HTML", reply_markup: { inline_keyboard: [[{ text: "❌ لغو", callback_data: "trial_duration_cancel" }]] } });
}

async function sendTrialMemberPicker(env, chatId, action) {
  const members = await getStreamTimeMembers(env);
  const rows = [];
  for (const id of members) {
    const stats = await getTeamStats(env, id);
    const active = stats.status === "Trial" && Number(stats.trialUntil || 0) > Date.now();
    if (action === "stop" && !active) continue;
    const profile = await getTelegramProfile(env, id);
    rows.push([{ text: `${active ? "🟡 " : ""}${getPublicUserName(profile, id)}`, callback_data: `trial_member:${action}:${id}` }]);
  }
  if (!rows.length) {
    await telegram(env, "sendMessage", { chat_id: chatId, text: action === "start" ? "❌ عضوی برای شروع Trial وجود ندارد." : "❌ هیچ Trial فعالی پیدا نشد.", reply_markup: { inline_keyboard: [[{ text: "🔙 مدیریت StreamTime", callback_data: "streamtime_manage" }]] } });
    return;
  }
  rows.push([{ text: "🔙 مدیریت StreamTime", callback_data: "streamtime_manage" }]);
  await telegram(env, "sendMessage", { chat_id: chatId, text: action === "start" ? "🟡 <b>انتخاب عضو برای شروع Trial</b>" : "🔴 <b>انتخاب عضو برای پایان Trial</b>", parse_mode: "HTML", reply_markup: { inline_keyboard: rows } });
}

async function sendStreamTimeManagementMenu(env, chatId) {
  // Legacy management entry points now open the single unified team dashboard.
  return sendTeamDashboard(env, chatId);
}

async function getQualityAdmins(env) {
  if (!env.BOT_STATE) return [];
  const saved = await env.BOT_STATE.get("team:quality_admins", "json");
  return Array.isArray(saved) ? [...new Set(saved.map(Number).filter(id => Number.isSafeInteger(id) && id > 0 && id !== Number(OWNER_ID)))] : [];
}
async function getQualityEvaluators(env) {
  if (!env.BOT_STATE) return [];
  const saved = await env.BOT_STATE.get("team:quality_evaluators", "json");
  return Array.isArray(saved) ? saved.filter(item => item && Number.isSafeInteger(Number(item.userId)) && Number(item.userId) > 0) : [];
}
async function isQualityAdmin(env, userId) {
  const id = Number(userId);
  if (id === Number(OWNER_ID)) return true;
  const legacy = await getQualityAdmins(env);
  const evaluators = await getQualityEvaluators(env);
  return legacy.includes(id) || evaluators.some(item => Number(item.userId) === id);
}
async function getSupportAdmins(
  env
) {
  if (!env.BOT_STATE) {
    return [
      ...SUPPORT_ADMIN_IDS
    ];
  }
  const saved =
    await env.BOT_STATE.get(
      "support:admins",
      "json"
    );
  if (
    Array.isArray(saved)
  ) {
    return [
      ...new Set(
        saved
          .map(Number)
          .filter(
            id =>
              Number.isFinite(id) &&
              id > 0
          )
      )
    ];
  }
  const initial = [
    ...new Set(
      SUPPORT_ADMIN_IDS
        .map(Number)
        .filter(
          id =>
            Number.isFinite(id) &&
            id > 0
        )
    )
  ];
  await env.BOT_STATE.put(
    "support:admins",
    JSON.stringify(
      initial
    )
  );
  return initial;
}
async function saveSupportAdmins(
  env,
  admins
) {
  if (!env.BOT_STATE) {
    return;
  }
  const unique = [
    ...new Set(
      admins
        .map(Number)
        .filter(
          id =>
            Number.isFinite(id) &&
            id > 0
        )
    )
  ];
  await env.BOT_STATE.put(
    "support:admins",
    JSON.stringify(
      unique
    )
  );
}
async function isSupportAdmin(
  env,
  userId
) {
  if (
    Number(userId) ===
    Number(OWNER_ID)
  ) {
    return false;
  }
  const admins =
    await getSupportAdmins(
      env
    );
  return admins.includes(
    Number(userId)
  );
}
async function addSupportAdmin(
  env,
  userId
) {
  const admins =
    await getSupportAdmins(
      env
    );
  const id =
    Number(userId);
  if (
    !id ||
    id === Number(OWNER_ID)
  ) {
    return false;
  }
  if (
    admins.includes(id)
  ) {
    return false;
  }
  admins.push(
    id
  );
  await saveSupportAdmins(
    env,
    admins
  );
  return true;
}
async function removeSupportAdmin(
  env,
  userId
) {
  const admins =
    await getSupportAdmins(
      env
    );
  const id =
    Number(userId);
  const newAdmins =
    admins.filter(
      adminId =>
        Number(adminId) !==
        id
    );
  const removed =
    newAdmins.length !==
    admins.length;
  if (
    removed
  ) {
    await saveSupportAdmins(
      env,
      newAdmins
    );
  }
  return removed;
}
async function sendSupportAdminManagementMenu(env, chatId) {
  return sendTeamDashboard(env, chatId);
}

async function sendSupportAdminList(
  env,
  chatId
) {
  const admins =
    await getSupportAdmins(
      env
    );
  if (
    admins.length ===
    0
  ) {
    await telegram(
      env,
      "sendMessage",
      {
        chat_id:
          chatId,
        text:
          "📋 هنوز هیچ ادمین Support ثبت نشده است.",
        reply_markup: {
          inline_keyboard: [
            [
              {
                text:
                  "➕ افزودن ادمین",
                callback_data:
                  "support_admin_add"
              }
            ],
            [
              {
                text:
                  "🔙 مدیریت ادمین Support",
                callback_data:
                  "support_admin_manage"
              }
            ]
          ]
        }
      }
    );
    return;
  }
  let text =
    "📋 <b>لیست ادمین‌های Support</b>\n\n";
  for (
    let index = 0;
    index < admins.length;
    index++
  ) {
    const id =
      admins[index];
    const profile =
      await getTelegramProfile(
        env,
        id
      );
    text +=
      `${index + 1}. ` +
      `${formatTelegramProfile(profile, id)}\n\n`;
  }
  await telegram(
    env,
    "sendMessage",
    {
      chat_id:
        chatId,
      text:
        text,
      parse_mode:
        "HTML",
      reply_markup: {
        inline_keyboard: [
          [
            {
              text:
                "➕ افزودن ادمین",
              callback_data:
                "support_admin_add"
            },
            {
              text:
                "➖ حذف ادمین",
              callback_data:
                "support_admin_remove"
            }
          ],
          [
            {
              text:
                "🔙 مدیریت ادمین Support",
              callback_data:
                "support_admin_manage"
            }
          ]
        ]
      }
    }
  );
}
async function getStreamTimeGroups(
  env
) {
  if (!env.BOT_STATE) {
    return [];
  }
  const saved =
    await env.BOT_STATE.get(
      "streamtime:groups",
      "json"
    );
  if (
    Array.isArray(saved)
  ) {
    return saved.map(
      item => ({
        chatId:
          String(
            item.chatId
          ),
        title:
          item.title ||
          "گروه بدون نام",
        type:
          item.type ||
          "unknown"
      })
    );
  }
  return [];
}
async function saveStreamTimeGroups(
  env,
  groups
) {
  if (!env.BOT_STATE) {
    return;
  }
  const unique = [];
  const seen =
    new Set();
  for (
    const group of groups
  ) {
    const chatId =
      String(
        group.chatId
      );
    if (
      seen.has(chatId)
    ) {
      continue;
    }
    seen.add(
      chatId
    );
    unique.push({
      chatId:
        chatId,
      title:
        group.title ||
        "گروه بدون نام",
      type:
        group.type ||
        "unknown"
    });
  }
  await env.BOT_STATE.put(
    "streamtime:groups",
    JSON.stringify(
      unique
    )
  );
}
async function resolveStreamTimeGroup(
  env,
  input
) {
  const value =
    String(
      input || ""
    ).trim();
  if (!value) {
    return null;
  }
  try {
    const result =
      await telegram(
        env,
        "getChat",
        {
          chat_id:
            value
        }
      );
    if (
      !result ||
      !result.ok ||
      !result.result
    ) {
      return null;
    }
    const chat =
      result.result;
    const title =
      chat.title ||
      "گروه بدون نام";
    return {
      chatId:
        String(
          chat.id
        ),
      title:
        title,
      type:
        chat.type ||
        "unknown"
    };
  } catch (error) {
    console.log(
      "RESOLVE STREAMTIME GROUP ERROR:",
      error
    );
    return null;
  }
}
async function addStreamTimeGroup(
  env,
  group
) {
  const groups =
    await getStreamTimeGroups(
      env
    );
  const exists =
    groups.some(
      item =>
        String(item.chatId) ===
        String(group.chatId)
    );
  if (
    exists
  ) {
    return {
      added:
        false,
      groups:
        groups
    };
  }
  groups.push(
    group
  );
  await saveStreamTimeGroups(
    env,
    groups
  );
  return {
    added:
      true,
    groups:
      groups
  };
}
async function removeStreamTimeGroup(
  env,
  chatId
) {
  const groups =
    await getStreamTimeGroups(
      env
    );
  const id =
    String(
      chatId
    );
  const newGroups =
    groups.filter(
      group =>
        String(group.chatId) !==
        id
    );
  const removed =
    newGroups.length !==
    groups.length;
  if (
    removed
  ) {
    await saveStreamTimeGroups(
      env,
      newGroups
    );
  }
  return removed;
}
async function sendStreamTimeGroupManagementMenu(env, chatId) {
  return sendTeamDashboard(env, chatId);
}

async function sendStreamTimeGroups(
  env,
  chatId
) {
  const groups =
    await getStreamTimeGroups(
      env
    );
  if (
    groups.length ===
    0
  ) {
    await telegram(
      env,
      "sendMessage",
      {
        chat_id:
          chatId,
        text:
          "📋 هنوز هیچ گروهی برای دریافت گزارش StreamTime ثبت نشده است.",
        reply_markup: {
          inline_keyboard: [
            [
              {
                text:
                  "➕ افزودن گروه",
                callback_data:
                  "streamtime_group_add"
              }
            ],
            [
              {
                text:
                  "🔙 مدیریت گروه‌ها",
                callback_data:
                  "streamtime_group_manage"
              }
            ]
          ]
        }
      }
    );
    return;
  }
  let text =
    "📋 <b>گروه‌های StreamTime</b>\n\n";
  for (
    let index = 0;
    index < groups.length;
    index++
  ) {
    const group =
      groups[index];
    text +=
      `${index + 1}. <b>${escapeHtml(group.title)}</b>\n` +
      `🆔 ${escapeHtml(group.chatId)}\n` +
      `📌 ${escapeHtml(group.type)}\n\n`;
  }
  text +=
    "📥 بعد از ثبت هر StreamTime، گزارش آن برای تمام گروه‌های بالا ارسال می‌شود.";
  await telegram(
    env,
    "sendMessage",
    {
      chat_id:
        chatId,
      text:
        text,
      parse_mode:
        "HTML",
      reply_markup: {
        inline_keyboard: [
          [
            {
              text:
                "🔄 بروزرسانی",
              callback_data:
                "streamtime_group_list"
            }
          ],
          [
            {
              text:
                "🔙 مدیریت گروه‌ها",
              callback_data:
                "streamtime_group_manage"
            }
          ]
        ]
      }
    }
  );
}
async function sendStreamTimeGroupTest(
  env
) {
  const groups =
    await getStreamTimeGroups(
      env
    );
  let success =
    0;
  let failed =
    0;
  const failedItems =
    [];
  for (
    const group of groups
  ) {
    try {
      const result =
        await telegram(
          env,
          "sendMessage",
          {
            chat_id:
              group.chatId,
            text:
              "🧪 <b>تست سیستم StreamTime</b>\n\n" +
              "✅ این پیام برای بررسی فعال بودن گروه ارسال شده است.",
            parse_mode:
              "HTML"
          }
        );
      if (
        result &&
        result.ok
      ) {
        success++;
        const sentMessageId = result.result?.message_id;
        if (sentMessageId) await queueStreamAnnouncementDeletion(env, group.chatId, sentMessageId);
      } else {
        failed++;
        failedItems.push({
          title:
            group.title,
          chatId:
            group.chatId
        });
      }
    } catch (error) {
      failed++;
      failedItems.push({
        title:
          group.title,
        chatId:
          group.chatId
      });
      console.log(
        "STREAMTIME GROUP TEST ERROR:",
        group.chatId,
        error
      );
    }
  }
  return {
    total:
      groups.length,
    success:
      success,
    failed:
      failed,
    failedItems:
      failedItems
  };
}
async function sendStreamAnnouncementAccessMembers(
  env,
  chatId
) {
  const users =
    await getStreamTimeMembers(
      env
    );
  if (
    users.length ===
    0
  ) {
    await telegram(
      env,
      "sendMessage",
      {
        chat_id:
          chatId,
        text:
          "📋 هنوز هیچ عضو تأییدشده‌ای در StreamTime وجود ندارد.",
        reply_markup: {
          inline_keyboard: [
            [
              {
                text:
                  "🔙 مدیریت StreamTime",
                callback_data:
                  "streamtime_manage"
              }
            ]
          ]
        }
      }
    );
    return;
  }
  const keyboard =
    [];
  for (
    const targetId of users
  ) {
    const profile =
      await getTelegramProfile(
        env,
        targetId
      );
    const allowed =
      await isAllowedStreamAnnouncement(
        env,
        targetId
      );
    const firstName =
      profile?.first_name ||
      "نام ثبت نشده";
    const lastName =
      profile?.last_name ||
      "";
    const fullName =
      [
        firstName,
        lastName
      ]
        .join(" ")
        .trim();
    const username =
      profile?.username
        ? ` @${profile.username}`
        : "";
    const status =
      allowed
        ? "✅"
        : "❌";
    keyboard.push([
      {
        text:
          `${status} ${fullName || "نام ثبت نشده"}${username}`,
        callback_data:
          `streamannounce_access_member:${targetId}`
      }
    ]);
  }
  keyboard.push([
    {
      text:
        "🔙 مدیریت StreamTime",
      callback_data:
        "streamtime_manage"
    }
  ]);
  keyboard.push([
    {
      text:
        "🏠 منوی اصلی",
      callback_data:
        "home"
    }
  ]);
  await telegram(
    env,
    "sendMessage",
    {
      chat_id:
        chatId,
      text:
        "🔐 <b>مدیریت دسترسی اعلام استریم</b>\n\n" +
        "📋 فقط اعضای تأییدشده StreamTime نمایش داده می‌شوند.\n\n" +
        "✅ = دسترسی اعلام استریم دارد\n" +
        "❌ = دسترسی اعلام استریم ندارد\n\n" +
        "روی نام هر شخص بزن تا دسترسی او را فعال یا غیرفعال کنی.",
      parse_mode:
        "HTML",
      reply_markup: {
        inline_keyboard:
          keyboard
      }
    }
  );
}
async function saveBotUser(
  env,
  userId
) {
  if (!env.BOT_STATE) {
    return;
  }
  await env.BOT_STATE.put(
    `bot:user:${userId}`,
    JSON.stringify({
      userId:
        Number(userId),
      started:
        true,
      startedAt:
        Date.now()
    })
  );
}
async function getUsersByPrefix(
  env,
  prefix
) {
  const users =
    new Set();
  let cursor =
    undefined;
  while (true) {
    const options = {
      prefix:
        prefix
    };
    if (cursor) {
      options.cursor =
        cursor;
    }
    const result =
      await env.BOT_STATE.list(
        options
      );
    for (
      const key of result.keys || []
    ) {
      const id =
        key.name.replace(
          prefix,
          ""
        );
      if (
        /^\d+$/.test(id)
      ) {
        users.add(
          Number(id)
        );
      }
    }
    if (
      result.list_complete
    ) {
      break;
    }
    cursor =
      result.cursor;
    if (!cursor) {
      break;
    }
  }
  return users;
}
async function getBotStartedUsers(
  env
) {
  if (!env.BOT_STATE) {
    return [];
  }
  const users =
    new Set();
  const botUsers =
    await getUsersByPrefix(
      env,
      "bot:user:"
    );
  for (
    const id of botUsers
  ) {
    users.add(
      Number(id)
    );
  }
  const profileUsers =
    await getUsersByPrefix(
      env,
      "telegram:profile:"
    );
  for (
    const id of profileUsers
  ) {
    users.add(
      Number(id)
    );
  }
  return [
    ...users
  ];
}
async function getBroadcastUsers(
  env
) {
  return await getBotStartedUsers(
    env
  );
}
async function sendBotUserCount(
  env,
  chatId
) {
  const users =
    await getBotStartedUsers(
      env
    );
  await telegram(
    env,
    "sendMessage",
    {
      chat_id:
        chatId,
      text:
        "📊 <b>آمار کاربران ربات</b>\n\n" +
        `👥 تعداد کاربران: <b>${users.length}</b>\n\n` +
        "این تعداد بر اساس کاربران ثبت‌شده در اطلاعات ربات محاسبه شده است.",
      parse_mode:
        "HTML",
      reply_markup: {
        inline_keyboard: [
          [
            {
              text:
                "🔄 بروزرسانی",
              callback_data:
                "streamtime_users_count"
            }
          ],
          [
            {
              text:
                "🔙 مدیریت StreamTime",
              callback_data:
                "streamtime_manage"
            }
          ]
        ]
      }
    }
  );
}
async function getStreamAnnouncementAllowedUsers(
  env
) {
  if (!env.BOT_STATE) {
    return [
      Number(OWNER_ID)
    ];
  }
  const saved =
    await env.BOT_STATE.get(
      "streamannounce:allowed",
      "json"
    );
  if (
    Array.isArray(saved)
  ) {
    return [
      ...new Set(
        saved.map(Number)
      )
    ];
  }
  const initial = [
    Number(OWNER_ID)
  ];
  await env.BOT_STATE.put(
    "streamannounce:allowed",
    JSON.stringify(
      initial
    )
  );
  return initial;
}
async function saveStreamAnnouncementAllowedUsers(
  env,
  users
) {
  if (!env.BOT_STATE) {
    return;
  }
  const unique = [
    ...new Set(
      users.map(Number)
    )
  ];
  if (
    !unique.includes(
      Number(OWNER_ID)
    )
  ) {
    unique.unshift(
      Number(OWNER_ID)
    );
  }
  await env.BOT_STATE.put(
    "streamannounce:allowed",
    JSON.stringify(
      unique
    )
  );
}
async function isAllowedStreamAnnouncement(
  env,
  userId
) {
  if (
    Number(userId) ===
    Number(OWNER_ID)
  ) {
    return true;
  }
  const users =
    await getStreamAnnouncementAllowedUsers(
      env
    );
  return users.includes(
    Number(userId)
  );
}
async function saveStreamAnnouncementAccess(
  env,
  userId
) {
  const users =
    await getStreamAnnouncementAllowedUsers(
      env
    );
  if (
    !users.includes(
      Number(userId)
    )
  ) {
    users.push(
      Number(userId)
    );
  }
  await saveStreamAnnouncementAllowedUsers(
    env,
    users
  );
}
async function deleteStreamAnnouncementAccess(
  env,
  userId
) {
  if (
    Number(userId) ===
    Number(OWNER_ID)
  ) {
    return;
  }
  const users =
    await getStreamAnnouncementAllowedUsers(
      env
    );
  const newUsers =
    users.filter(
      id =>
        Number(id) !==
        Number(userId)
    );
  await saveStreamAnnouncementAllowedUsers(
    env,
    newUsers
  );
}
async function getStreamAnnounceChats(
  env
) {
  if (!env.BOT_STATE) {
    return [];
  }
  const saved =
    await env.BOT_STATE.get(
      "streamannounce:chats",
      "json"
    );
  if (
    Array.isArray(saved)
  ) {
    return saved.map(
      item => ({
        chatId:
          String(
            item.chatId
          ),
        title:
          item.title ||
          "مقصد بدون نام",
        type:
          item.type ||
          "unknown"
      })
    );
  }
  const oldChatId =
    await env.BOT_STATE.get(
      "streamannounce:chat"
    );
  if (oldChatId) {
    const migrated = [
      {
        chatId:
          String(oldChatId),
        title:
          "مقصد قدیمی",
        type:
          "unknown"
      }
    ];
    await env.BOT_STATE.put(
      "streamannounce:chats",
      JSON.stringify(
        migrated
      )
    );
    return migrated;
  }
  return [];
}
async function saveStreamAnnounceChats(
  env,
  chats
) {
  if (!env.BOT_STATE) {
    return;
  }
  const unique =
    [];
  const seen =
    new Set();
  for (
    const chat of chats
  ) {
    const chatId =
      String(
        chat.chatId
      );
    if (
      seen.has(chatId)
    ) {
      continue;
    }
    seen.add(
      chatId
    );
    unique.push({
      chatId:
        chatId,
      title:
        chat.title ||
        "مقصد بدون نام",
      type:
        chat.type ||
        "unknown"
    });
  }
  await env.BOT_STATE.put(
    "streamannounce:chats",
    JSON.stringify(
      unique
    )
  );
}
async function addStreamAnnounceChat(
  env,
  chatId,
  title,
  type
) {
  const chats =
    await getStreamAnnounceChats(
      env
    );
  const id =
    String(chatId);
  const exists =
    chats.some(
      chat =>
        String(chat.chatId) ===
        id
    );
  if (exists) {
    return {
      added:
        false,
      chats:
        chats
    };
  }
  chats.push({
    chatId:
      id,
    title:
      title ||
      "مقصد بدون نام",
    type:
      type ||
      "unknown"
  });
  await saveStreamAnnounceChats(
    env,
    chats
  );
  return {
    added:
      true,
    chats:
      chats
  };
}
async function removeStreamAnnounceChat(
  env,
  chatId
) {
  const chats =
    await getStreamAnnounceChats(
      env
    );
  const id =
    String(chatId);
  const newChats =
    chats.filter(
      chat =>
        String(chat.chatId) !==
        id
    );
  const removed =
    newChats.length !==
    chats.length;
  if (
    removed
  ) {
    await saveStreamAnnounceChats(
      env,
      newChats
    );
  }
  return removed;
}
async function resolveStreamAnnounceChat(
  env,
  input
) {
  const value =
    String(
      input || ""
    ).trim();
  if (!value) {
    return null;
  }
  try {
    const result =
      await telegram(
        env,
        "getChat",
        {
          chat_id:
            value
        }
      );
    if (
      !result ||
      !result.ok ||
      !result.result
    ) {
      return null;
    }
    const chat =
      result.result;
    const title =
      chat.title ||
      [
        chat.first_name || "",
        chat.last_name || ""
      ]
        .join(" ")
        .trim() ||
      (
        chat.username
          ? `@${chat.username}`
          : "مقصد بدون نام"
      );
    return {
      chatId:
        String(chat.id),
      title:
        title,
      type:
        chat.type ||
        "unknown"
    };
  } catch (error) {
    console.log(
      "RESOLVE STREAM CHAT ERROR:",
      error
    );
    return null;
  }
}
async function sendStreamAnnounceManagementMenu(env, chatId) {
  return sendTeamDashboard(env, chatId);
}

async function sendStreamAnnounceChats(
  env,
  chatId
) {
  const chats =
    await getStreamAnnounceChats(
      env
    );
  if (
    chats.length === 0
  ) {
    await telegram(
      env,
      "sendMessage",
      {
        chat_id:
          chatId,
        text:
          "📋 هنوز هیچ مقصدی برای اعلام استریم ثبت نشده است.\n\n" +
          "برای افزودن مقصد می‌توانی از دکمه «➕ افزودن مقصد» استفاده کنی یا داخل گروه دستور زیر را بفرستی:\n\n" +
          "/setstreamgroup"
      }
    );
    return;
  }
  let text =
    "📋 <b>لیست مقصدهای اعلام استریم</b>\n\n";
  for (
    let index = 0;
    index < chats.length;
    index++
  ) {
    const item =
      chats[index];
    text +=
      `${index + 1}. <b>${escapeHtml(item.title)}</b>\n` +
      `🆔 ${escapeHtml(item.chatId)}\n` +
      `📌 ${escapeHtml(item.type)}\n\n`;
  }
  text +=
    "📢 هر اعلام استریم در تمام مقصدهای بالا ارسال می‌شود.";
  await telegram(
    env,
    "sendMessage",
    {
      chat_id:
        chatId,
      text:
        text,
      parse_mode:
        "HTML",
      reply_markup: {
        inline_keyboard: [
          [
            {
              text:
                "🔄 بروزرسانی",
              callback_data:
                "streamannounce_list"
            }
          ],
          [
            {
              text:
                "🔙 مدیریت مقصدها",
              callback_data:
                "streamannounce_manage"
            }
          ]
        ]
      }
    }
  );
}
async function sendStreamAnnounceTest(
  env
) {
  const chats =
    await getStreamAnnounceChats(
      env
    );
  let success =
    0;
  let failed =
    0;
  const failedItems =
    [];
  for (
    const chat of chats
  ) {
    try {
      const result =
        await telegram(
          env,
          "sendMessage",
          {
            chat_id:
              chat.chatId,
            text:
              "🧪 <b>تست سیستم اعلام استریم</b>\n\n" +
              "✅ این پیام برای بررسی فعال بودن مقصد ارسال شده است.",
            parse_mode:
              "HTML"
          }
        );
      if (
        result &&
        result.ok
      ) {
        success++;
        const sentMessage = result.result;
        if (sentMessage?.message_id) {
          await queueStreamAnnouncementDeletion(env, chat.chatId, sentMessage.message_id);
        }
      } else {
        failed++;
        failedItems.push({
          title:
            chat.title,
          chatId:
            chat.chatId
        });
      }
    } catch (error) {
      failed++;
      failedItems.push({
        title:
          chat.title,
        chatId:
          chat.chatId
      });
      console.log(
        "STREAM ANNOUNCE TEST ERROR:",
        chat.chatId,
        error
      );
    }
  }
  return {
    total:
      chats.length,
    success:
      success,
    failed:
      failed,
    failedItems:
      failedItems
  };
}
async function startStreamAnnouncement(env, chatId, userId) {
  const chats = await getStreamAnnounceChats(env);
  if (!chats.length) { await telegram(env, "sendMessage", { chat_id: chatId, text: "❌ هنوز مقصدی برای اعلام استریم تنظیم نشده است." }); return; }
  const template = await env.BOT_STATE.get(`team:announce_template:${Number(userId)}`, "json");
  if (!template || !Array.isArray(template.titles) || !template.titles.length || !template.photo || !template.link) {
    await telegram(env, "sendMessage", { chat_id: chatId, text: "❌ قالب اعلام استریم شما هنوز توسط مدیر تنظیم نشده است. به مدیر اطلاع بده تا لینک، عکس و عنوان‌های آماده را ثبت کند." }); return;
  }
  const rows = template.titles.map((title, index) => [{ text: `🎮 ${String(title).slice(0, 50)}`, callback_data: `streamannounce_title:${Number(userId)}:${index}` }]);
  await telegram(env, "sendMessage", { chat_id: chatId, text: "📣 <b>اعلام استریم</b>\n\nیکی از عنوان‌های آماده را انتخاب کن. لینک و عکس از قبل ثبت شده‌اند و خودکار در کانال ارسال می‌شوند:", parse_mode: "HTML", reply_markup: { inline_keyboard: rows } });
}

async function getStreamAnnounceState(
  env,
  userId
) {
  if (!env.BOT_STATE) {
    return null;
  }
  return await env.BOT_STATE.get(
    `streamannounce:${userId}`,
    "json"
  );
}
async function saveStreamAnnounceState(
  env,
  userId,
  state
) {
  if (!env.BOT_STATE) {
    return;
  }
  await env.BOT_STATE.put(
    `streamannounce:${userId}`,
    JSON.stringify(
      state
    ),
    {
      expirationTtl:
        900
    }
  );
}
async function deleteStreamAnnounceState(
  env,
  userId
) {
  if (!env.BOT_STATE) {
    return;
  }
  await env.BOT_STATE.delete(
    `streamannounce:${userId}`
  );
}
async function handleStreamAnnouncementStep(
  env,
  message,
  state
) {
  const userId =
    message.from.id;
  const chatId =
    message.chat.id;
  const text =
    message.text
      ? message.text.trim()
      : "";
  const allowed =
    await isAllowedStreamAnnouncement(
      env,
      userId
    );
  if (!allowed) {
    await deleteStreamAnnounceState(
      env,
      userId
    );
    await telegram(
      env,
      "sendMessage",
      {
        chat_id:
          chatId,
        text:
          "❌ دسترسی شما برای اعلام استریم وجود ندارد."
      }
    );
    return;
  }
  if (
    state.step ===
    1
  ) {
    if (!text) {
      await telegram(
        env,
        "sendMessage",
        {
          chat_id:
            chatId,
          text:
            "❌ لطفاً عنوان استریم را به صورت متن ارسال کنید."
        }
      );
      return;
    }
    state.data =
      state.data ||
      {};
    state.data.title =
      text;
    state.step =
      2;
    await saveStreamAnnounceState(
      env,
      userId,
      state
    );
    await telegram(
      env,
      "sendMessage",
      {
        chat_id:
          chatId,
        text:
          "✅ عنوان ثبت شد.\n\n" +
          "🔗 لینک استریم را ارسال کنید:"
      }
    );
    return;
  }
  if (
    state.step ===
    2
  ) {
    if (!text) {
      await telegram(
        env,
        "sendMessage",
        {
          chat_id:
            chatId,
          text:
            "❌ لطفاً لینک استریم را ارسال کنید."
        }
      );
      return;
    }
    state.data.link =
      text;
    state.step =
      3;
    await saveStreamAnnounceState(
      env,
      userId,
      state
    );
    await telegram(
      env,
      "sendMessage",
      {
        chat_id:
          chatId,
        text:
          "✅ لینک ثبت شد.\n\n" +
          "🖼️ حالا بنر استریم را به صورت عکس ارسال کن.\n\n" +
          "اگر بنر نداری، بنویس:\n" +
          "بدون بنر"
      }
    );
    return;
  }
  if (
    state.step ===
    3
  ) {
    const chats =
      await getStreamAnnounceChats(
        env
      );
    if (
      chats.length ===
      0
    ) {
      await deleteStreamAnnounceState(
        env,
        userId
      );
      await telegram(
        env,
        "sendMessage",
        {
          chat_id:
            chatId,
          text:
            "❌ در حال حاضر هیچ مقصدی برای اعلام استریم ثبت نشده است."
        }
      );
      return;
    }
    const profile =
      await getTelegramProfile(
        env,
        userId
      );
    const publicName =
      getPublicUserName(
        profile,
        userId
      );
    const title =
      state.data?.title ||
      "استریم جدید";
    const link =
      state.data?.link ||
      "";
    const announcementText =
      "🔴 <b>STREAM IS LIVE</b>\n\n" +
      `👤 <b>${escapeHtml(publicName)}</b>\n` +
      `🎮 <b>${escapeHtml(title)}</b>\n\n` +
      `🔗 ${escapeHtml(link)}\n\n` +
      "#Stream #Live";
    if (
      message.photo &&
      message.photo.length > 0
    ) {
      const photo =
        message.photo[
          message.photo.length - 1
        ];
      const result =
        await sendStreamAnnouncementToAll(
          env,
          chats,
          {
            type:
              "photo",
            photo:
              photo.file_id,
            text:
              announcementText
          }
        );
      await deleteStreamAnnounceState(
        env,
        userId
      );
      await sendStreamAnnouncementResult(
        env,
        chatId,
        result
      );
      const reviewResult = await sendStreamReviewPost(env, { targetId: userId, targetName: publicName, title, link, type: "photo", photo: photo.file_id });
      if (!reviewResult.ok) await telegram(env, "sendMessage", { chat_id: chatId, text: reviewResult.error || "⚠️ پیام ارزیابی ارسال نشد؛ گروه ارزیابی را تنظیم کن." });
      return;
    }
    if (
      text ===
        "بدون بنر" ||
      text ===
        "بدون بنر."
    ) {
      const result =
        await sendStreamAnnouncementToAll(
          env,
          chats,
          {
            type:
              "text",
            text:
              announcementText
          }
        );
      await deleteStreamAnnounceState(
        env,
        userId
      );
      await sendStreamAnnouncementResult(
        env,
        chatId,
        result
      );
      const reviewResult = await sendStreamReviewPost(env, { targetId: userId, targetName: publicName, title, link, type: "text" });
      if (!reviewResult.ok) await telegram(env, "sendMessage", { chat_id: chatId, text: reviewResult.error || "⚠️ پیام ارزیابی ارسال نشد؛ گروه ارزیابی را تنظیم کن." });
      return;
    }
    await telegram(
      env,
      "sendMessage",
      {
        chat_id:
          chatId,
        text:
          "❌ لطفاً یک عکس به عنوان بنر ارسال کن.\n\n" +
          "یا اگر بنر نداری، فقط بنویس:\n" +
          "بدون بنر"
      }
    );
  }
}
async function queueStreamAnnouncementDeletion(env, chatId, messageId) {
  if (!env.BOT_STATE || !chatId || !messageId) return;
  const item = { chatId: String(chatId), messageId: Number(messageId), deleteAt: Date.now() + 3 * 60 * 60 * 1000 };
  const key = `streamannounce:delete:${String(chatId)}:${Number(messageId)}`;
  await env.BOT_STATE.put(key, JSON.stringify(item), { expirationTtl: 172800 });
}

async function processExpiredStreamAnnouncements(env) {
  if (!env.BOT_STATE) return;
  let cursor;
  do {
    const options = { prefix: "streamannounce:delete:", limit: 100 };
    if (cursor) options.cursor = cursor;
    const page = await env.BOT_STATE.list(options);
    for (const entry of page.keys || []) {
      const item = await env.BOT_STATE.get(entry.name, "json");
      if (!item) {
        await env.BOT_STATE.delete(entry.name);
        continue;
      }
      if (Number(item.deleteAt || 0) > Date.now()) continue;
      try {
        const result = await telegram(env, "deleteMessage", { chat_id: item.chatId, message_id: Number(item.messageId) });
        if (!result?.ok && /timeout|network|temporar|too many requests/i.test(String(result?.description || ""))) {
          item.deleteAt = Date.now() + 15 * 60 * 1000;
          await env.BOT_STATE.put(entry.name, JSON.stringify(item), { expirationTtl: 172800 });
        } else {
          await env.BOT_STATE.delete(entry.name);
        }
      } catch (error) {
        item.deleteAt = Date.now() + 15 * 60 * 1000;
        await env.BOT_STATE.put(entry.name, JSON.stringify(item), { expirationTtl: 172800 });
        console.log("STREAM ANNOUNCEMENT AUTO DELETE ERROR:", item.chatId, error);
      }
    }
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);
}

async function sendStreamAnnouncementToAll(
  env,
  chats,
  announcement
) {
  let success =
    0;
  let failed =
    0;
  const failedItems =
    [];
  for (
    const chat of chats
  ) {
    try {
      let result =
        null;
      if (
        announcement.type ===
        "photo"
      ) {
        result =
          await telegram(
            env,
            "sendPhoto",
            {
              chat_id:
                chat.chatId,
              photo:
                announcement.photo,
              caption:
                announcement.text,
              parse_mode:
                "HTML"
            }
          );
      } else {
        result =
          await telegram(
            env,
            "sendMessage",
            {
              chat_id:
                chat.chatId,
              text:
                announcement.text,
              parse_mode:
                "HTML",
              disable_web_page_preview:
                false
            }
          );
      }
      if (
        result &&
        result.ok
      ) {
        success++;
        const sentMessageId = result.result?.message_id;
        if (sentMessageId) await queueStreamAnnouncementDeletion(env, chat.chatId, sentMessageId);
      } else {
        failed++;
        failedItems.push({
          title:
            chat.title,
          chatId:
            chat.chatId,
          error:
            result?.description ||
            "ارسال ناموفق"
        });
      }
    } catch (error) {
      failed++;
      failedItems.push({
        title:
          chat.title,
        chatId:
          chat.chatId,
        error:
          "خطای ارتباط با Telegram"
      });
      console.log(
        "STREAM ANNOUNCEMENT SEND ERROR:",
        chat.chatId,
        error
      );
    }
  }
  return {
    total:
      chats.length,
    success:
      success,
    failed:
      failed,
    failedItems:
      failedItems
  };
}
async function sendStreamAnnouncementResult(env, chatId, result) {
  const text = Number(result?.success || 0) > 0
    ? "✅ استریم اعلام شد."
    : "❌ اعلام استریم انجام نشد.";
  await telegram(env, "sendMessage", { chat_id: chatId, text });
}
function getPublicUserName(
  profile,
  userId
) {
  const gameName = String(profile?.game_name || "").trim();
  if (gameName) return gameName;
  const firstName =
    profile?.first_name ||
    "";
  const lastName =
    profile?.last_name ||
    "";
  const fullName =
    [
      firstName,
      lastName
    ]
      .join(" ")
      .trim();
  if (fullName) {
    return fullName;
  }
  if (profile?.username) {
    return `@${profile.username}`;
  }
  return `User ${userId}`;
}
function escapeHtml(
  text
) {
  return String(
    text || ""
  )
    .replace(
      /&/g,
      "&amp;"
    )
    .replace(
      /</g,
      "&lt;"
    )
    .replace(
      />/g,
      "&gt;"
    )
    .replace(
      /"/g,
      "&quot;"
    );
}
async function saveTelegramProfile(
  env,
  user
) {
  if (
    !env.BOT_STATE ||
    !user ||
    !user.id
  ) {
    return;
  }
  const profile = {
    id:
      Number(user.id),
    first_name:
      user.first_name || "",
    last_name:
      user.last_name || "",
    username:
      user.username || ""
  };
  await env.BOT_STATE.put(
    `telegram:profile:${user.id}`,
    JSON.stringify(
      profile
    )
  );
}
async function getTelegramProfile(
  env,
  userId
) {
  if (!env.BOT_STATE) {
    return null;
  }
  const gameName = await env.BOT_STATE.get(`team:game_name:${Number(userId)}`);
  const saved =
    await env.BOT_STATE.get(
      `telegram:profile:${userId}`,
      "json"
    );
  if (saved) {
    return { ...saved, ...(gameName ? { game_name: gameName } : {}) };
  }
  try {
    const result =
      await telegram(
        env,
        "getChat",
        {
          chat_id:
            Number(userId)
        }
      );
    if (
      result &&
      result.ok &&
      result.result
    ) {
      const chat =
        result.result;
      const profile = {
        id:
          Number(userId),
        first_name:
          chat.first_name || "",
        last_name:
          chat.last_name || "",
        username:
          chat.username || ""
      };
      await env.BOT_STATE.put(
        `telegram:profile:${userId}`,
        JSON.stringify(
          profile
        )
      );
      if (gameName) profile.game_name = gameName;
      return profile;
    }
  } catch (error) {
    console.log(
      "PROFILE ERROR:",
      error
    );
  }
  return null;
}
function formatTelegramProfile(
  profile,
  userId
) {
  const firstName =
    profile?.first_name ||
    "";
  const lastName =
    profile?.last_name ||
    "";
  const fullName =
    [
      firstName,
      lastName
    ]
      .join(" ")
      .trim();
  const username =
    profile?.username
      ? `@${profile.username}`
      : "";
  let result =
    "";
  if (fullName) {
    result +=
      `👤 ${fullName}\n`;
  } else {
    result +=
      "👤 نام ثبت نشده\n";
  }
  if (username) {
    result +=
      `🔹 ${username}\n`;
  }
  result +=
    `🆔 ${userId}`;
  return result;
}
async function getStreamTimeMembers(
  env
) {
  if (!env.BOT_STATE) {
    return [
      ...STREAMTIME_ALLOWED_IDS
    ];
  }
  const saved =
    await env.BOT_STATE.get(
      "streamtime:members",
      "json"
    );
  if (
    Array.isArray(saved)
  ) {
    return saved.map(
      Number
    );
  }
  const initial = [
    ...STREAMTIME_ALLOWED_IDS
  ];
  await env.BOT_STATE.put(
    "streamtime:members",
    JSON.stringify(
      initial
    )
  );
  return initial;
}
async function saveStreamTimeMembers(
  env,
  members
) {
  if (!env.BOT_STATE) {
    return;
  }
  const unique = [
    ...new Set(
      members.map(Number)
    )
  ];
  await env.BOT_STATE.put(
    "streamtime:members",
    JSON.stringify(
      unique
    )
  );
}
async function isAllowedStreamTime(
  env,
  userId
) {
  const members =
    await getStreamTimeMembers(
      env
    );
  return members.includes(
    Number(userId)
  );
}
async function sendStreamTimeMembers(
  env,
  chatId
) {
  const members =
    await getStreamTimeMembers(
      env
    );
  if (
    members.length ===
    0
  ) {
    await telegram(
      env,
      "sendMessage",
      {
        chat_id:
          chatId,
        text:
          "📋 هیچ عضوی برای StreamTime ثبت نشده است."
      }
    );
    return;
  }
  let text =
    "📋 اعضای مجاز StreamTime\n\n";
  for (
    let index = 0;
    index < members.length;
    index++
  ) {
    const id =
      members[index];
    const profile =
      await getTelegramProfile(
        env,
        id
      );
    const referral =
      await getUserReferral(
        env,
        id
      );
    const total =
      await getTotalStreamTime(
        env,
        id
      );
    text +=
      `${index + 1}. ` +
      `${formatTelegramProfile(profile, id)}\n` +
      `🎫 Referral: ${referral || "ثبت نشده"}\n` +
      `⏱️ مجموع تایم: ${formatDuration(total)}\n\n`;
  }
  await telegram(
    env,
    "sendMessage",
    {
      chat_id:
        chatId,
      text:
        text
    }
  );
}
async function sendStreamTimeTimeMembers(
  env,
  chatId
) {
  const members =
    await getStreamTimeMembers(
      env
    );
  if (
    members.length ===
    0
  ) {
    await telegram(
      env,
      "sendMessage",
      {
        chat_id:
          chatId,
        text:
          "📋 هیچ عضو StreamTime ثبت نشده است.",
        reply_markup: {
          inline_keyboard: [
            [
              {
                text:
                  "🔙 مدیریت StreamTime",
                callback_data:
                  "streamtime_manage"
              }
            ]
          ]
        }
      }
    );
    return;
  }
  const keyboard =
    [];
  for (
    const memberId of members
  ) {
    const profile =
      await getTelegramProfile(
        env,
        memberId
      );
    const firstName =
      profile?.first_name ||
      "نام ثبت نشده";
    const lastName =
      profile?.last_name ||
      "";
    const fullName =
      [
        firstName,
        lastName
      ]
      .join(" ")
      .trim();
    const username =
      profile?.username
        ? ` @${profile.username}`
        : "";
    const total =
      await getTotalStreamTime(
        env,
        memberId
      );
    keyboard.push([
      {
        text:
          `🕐 ${fullName || "نام ثبت نشده"}${username} | ${formatDuration(total)}`,
        callback_data:
          `streamtime_time_member:${memberId}`
      }
    ]);
  }
  keyboard.push([
    {
      text:
        "🔙 مدیریت StreamTime",
      callback_data:
        "streamtime_manage"
    }
  ]);
  await telegram(
    env,
    "sendMessage",
    {
      chat_id:
        chatId,
      text:
        "🕐 <b>مدیریت تایم اعضا</b>\n\n" +
        "عضوی که می‌خواهی تایمش را تغییر بدهی انتخاب کن:",
      parse_mode:
        "HTML",
      reply_markup: {
        inline_keyboard:
          keyboard
      }
    }
  );
}
function normalizePaymentDigits(
  text
) {
  return String(
    text || ""
  )
    .replace(
      /[۰-۹]/g,
      digit =>
        String(
          "۰۱۲۳۴۵۶۷۸۹".indexOf(
            digit
          )
        )
    )
    .replace(
      /[٠-٩]/g,
      digit =>
        String(
          "٠١٢٣٤٥٦٧٨٩".indexOf(
            digit
          )
        )
    );
}

function parsePaymentAmount(
  text
) {
  const normalized =
    normalizePaymentDigits(
      text
    )
      .replace(
        /[,\u066C\u066B\s]/g,
        ""
      );

  if (
    !/^\d+$/.test(
      normalized
    )
  ) {
    return null;
  }

  const amount =
    Number(
      normalized
    );

  if (
    !Number.isSafeInteger(
      amount
    ) ||
    amount < 0 ||
    amount > 1000000000000
  ) {
    return null;
  }

  return amount;
}

function getPaymentWeekKey(inputDate = new Date()) {
  const date = new Date(inputDate);
  const utcDate =
    new Date(
      Date.UTC(
        date.getUTCFullYear(),
        date.getUTCMonth(),
        date.getUTCDate()
      )
    );
  const day =
    utcDate.getUTCDay() ||
    7;

  utcDate.setUTCDate(
    utcDate.getUTCDate() +
      4 -
      day
  );

  const year =
    utcDate.getUTCFullYear();
  const yearStart =
    new Date(
      Date.UTC(
        year,
        0,
        1
      )
    );
  const week =
    Math.ceil(
      (
        (
          utcDate.getTime() -
          yearStart.getTime()
        ) /
          86400000 +
          1
      ) /
        7
    );

  return (
    `${year}-W${String(
      week
    ).padStart(2, "0")}`
  );
}

async function listAllBotStateKeys(env, prefix) {
  const names = [];
  let cursor;
  do {
    const options = { prefix, limit: 1000 };
    if (cursor) options.cursor = cursor;
    const page = await env.BOT_STATE.list(options);
    for (const item of page.keys || []) names.push(item.name);
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);
  return names;
}

async function getLifetimePaidTotals(env, userId) {
  const id = Number(userId);
  const empty = { money: 0, gold: 0, token: 0, count: 0 };
  if (!id || !env.BOT_STATE) return { ...empty };

  const cacheKey = `team:lifetime_payments:${id}`;
  const allKeys = await listAllBotStateKeys(env, "team:payment_history:");
  const historyTotals = { ...empty };
  const records = [];

  // The ledger is the source of truth. Match by userId first because legacy
  // and opening-balance keys do not all end with the numeric user ID.
  for (const key of allKeys) {
    const item = await env.BOT_STATE.get(key, "json");
    if (!item) continue;
    const recordUserId = Number(item.userId || key.split(":").pop());
    if (recordUserId !== id || item.paid !== true) continue;
    if (!["money", "gold", "token"].includes(item.choice)) continue;
    const amount = Math.max(0, Number(item.amount || 0));
    records.push({ key, item, amount });
    historyTotals[item.choice] += amount;
    if (Number.isFinite(Number(item.countContribution))) {
      historyTotals.count += Math.max(0, Number(item.countContribution));
    } else if (amount > 0) {
      historyTotals.count += 1;
    }
  }

  // Repair old installations where the cached lifetime balance was larger
  // than the ledger (for example, salaries added before history was introduced
  // or before an earlier migration ran). Use stable keys so this is idempotent.
  const cached = await env.BOT_STATE.get(cacheKey, "json");
  if (cached && typeof cached === "object") {
    const currencyDiffs = {};
    for (const currency of ["money", "gold", "token"]) {
      currencyDiffs[currency] = Math.max(
        0,
        Number(cached[currency] || 0) - Number(historyTotals[currency] || 0)
      );
    }
    const countDiff = Math.max(0, Number(cached.count || 0) - Number(historyTotals.count || 0));
    const hasAmountDiff = ["money", "gold", "token"].some(c => currencyDiffs[c] > 0);
    let countAssigned = false;
    const now = Date.now();

    for (const currency of ["money", "gold", "token"]) {
      const diff = currencyDiffs[currency];
      if (diff <= 0 && (countAssigned || countDiff <= 0)) continue;
      const key = `team:payment_history:opening:${id}:${currency}`;
      const existing = await env.BOT_STATE.get(key, "json");
      const oldAmount = Math.max(0, Number(existing?.amount || 0));
      const desiredAmount = oldAmount + diff;
      const countContribution = !countAssigned ? countDiff : 0;
      if (diff > 0 || countContribution > 0) {
        await env.BOT_STATE.put(key, JSON.stringify({
          userId: id,
          choice: currency,
          amount: desiredAmount,
          paid: true,
          legacy: true,
          openingBalance: true,
          countContribution: Math.max(0, Number(existing?.countContribution || 0)) + countContribution,
          paidAt: Number(existing?.paidAt || now),
          week: "opening-balance"
        }));
      }
      if (countContribution > 0) countAssigned = true;
    }

    if (!hasAmountDiff && countDiff > 0 && !countAssigned) {
      const key = `team:payment_history:opening:${id}:count`;
      const existing = await env.BOT_STATE.get(key, "json");
      await env.BOT_STATE.put(key, JSON.stringify({
        userId: id, choice: "money", amount: 0, paid: true,
        legacy: true, openingBalance: true,
        countContribution: Math.max(0, Number(existing?.countContribution || 0)) + countDiff,
        paidAt: Number(existing?.paidAt || now), week: "opening-balance"
      }));
    }
  }

  // Rebuild totals after any opening-balance repair. Do not add the cache to
  // these totals: the cache is only a compatibility mirror, not a second ledger.
  const totals = { ...empty };
  const refreshedKeys = await listAllBotStateKeys(env, "team:payment_history:");
  for (const key of refreshedKeys) {
    const item = await env.BOT_STATE.get(key, "json");
    if (!item || Number(item.userId || key.split(":").pop()) !== id) continue;
    if (item.paid !== true || !["money", "gold", "token"].includes(item.choice)) continue;
    const amount = Math.max(0, Number(item.amount || 0));
    totals[item.choice] += amount;
    if (Number.isFinite(Number(item.countContribution))) {
      totals.count += Math.max(0, Number(item.countContribution));
    } else if (amount > 0) {
      totals.count += 1;
    }
  }
  await env.BOT_STATE.put(cacheKey, JSON.stringify(totals));
  return totals;
}

async function getAllTimePaidTotals(env) {
  const totals = { money: 0, gold: 0, token: 0, count: 0 };
  if (!env.BOT_STATE) return totals;
  const ids = new Set();
  for (const key of await listAllBotStateKeys(env, "team:lifetime_payments:")) {
    const id = Number(key.slice("team:lifetime_payments:".length));
    if (id > 0) ids.add(id);
  }
  for (const key of await listAllBotStateKeys(env, "team:payment_history:")) {
    const history = await env.BOT_STATE.get(key, "json");
    const id = Number(history?.userId || key.split(":").pop());
    if (id > 0) ids.add(id);
  }
  // Include current team members explicitly so their old cached balance can
  // be reconciled even if they have no matching history key.
  for (const memberId of await getStreamTimeMembers(env)) {
    const id = Number(memberId);
    if (id > 0 && id !== Number(OWNER_ID)) ids.add(id);
  }
  for (const id of ids) {
    const item = await getLifetimePaidTotals(env, id);
    totals.money += Number(item.money || 0);
    totals.gold += Number(item.gold || 0);
    totals.token += Number(item.token || 0);
    totals.count += Number(item.count || 0);
  }
  return totals;
}

function formatPaidTotals(totals) {
  return `💵 پول بازی: <b>${Number(totals.money || 0).toLocaleString("en-US")}</b>\n` +
    `🥇 گلد بازی: <b>${Number(totals.gold || 0).toLocaleString("en-US")}</b>\n` +
    `🪙 توکن بازی: <b>${Number(totals.token || 0).toLocaleString("en-US")}</b>`;
}

async function sendWeeklyPaymentMembers(
  env,
  chatId
) {
  const members =
    await getStreamTimeMembers(
      env
    );

  if (
    members.length === 0
  ) {
    await telegram(
      env,
      "sendMessage",
      {
        chat_id:
          chatId,
        text:
          "💰 هیچ عضو تأییدشده‌ای برای ثبت حقوق هفتگی وجود ندارد.",
        reply_markup: {
          inline_keyboard: [
            [
              {
                text:
                  "🔙 مدیریت StreamTime",
                callback_data:
                  "streamtime_manage"
              }
            ]
          ]
        }
      }
    );
    return;
  }

  const keyboard =
    [];

  for (
    const memberId of members
  ) {
    const profile =
      await getTelegramProfile(
        env,
        memberId
      );

    const name =
      [
        profile?.first_name || "",
        profile?.last_name || ""
      ]
        .join(" ")
        .trim() ||
      "نام ثبت نشده";

    const username =
      profile?.username
        ? ` @${profile.username}`
        : "";

    keyboard.push(
      [
        {
          text:
            `👤 ${name}${username}`,
          callback_data:
            `weekly_payment_member:${memberId}`
        }
      ]
    );
  }

  keyboard.push(
    [
      {
        text:
          "🔙 مدیریت StreamTime",
        callback_data:
          "streamtime_manage"
      }
    ]
  );

  await telegram(
    env,
    "sendMessage",
    {
      chat_id:
        chatId,
      text:
        "💰 <b>ثبت حقوق هفتگی</b>\n\n" +
        "عضوی که می‌خواهی حقوق هفتگی برایش ثبت کنی انتخاب کن:",
      parse_mode:
        "HTML",
      reply_markup: {
        inline_keyboard:
          keyboard
      }
    }
  );
}

async function sendPaymentList(env, chatId) {
  const members = (await getStreamTimeMembers(env)).filter(id => Number(id) !== Number(OWNER_ID));
  if (!members.length) {
    await telegram(env, "sendMessage", { chat_id: chatId, text: "📋 هنوز عضوی برای نمایش حقوق این هفته وجود ندارد.", reply_markup: { inline_keyboard: [[{ text: "🔙 داشبورد مدیریت", callback_data: "team_dashboard" }]] } });
    return;
  }
  const week = getPaymentWeekKey();
  let message = `💰 <b>حقوق این هفته اعضا · ${escapeHtml(week)}</b>\n\n`;
  const rows = [];
  for (let index = 0; index < members.length; index++) {
    const id = Number(members[index]);
    const payment = await env.BOT_STATE.get(`team:payment:${id}`, "json");
    const pending = await env.BOT_STATE.get(`team:salary_pending:${id}`, "json");
    const profile = await getTelegramProfile(env, id);
    const name = getPublicUserName(profile, id);
    const referral = await getUserReferral(env, id);
    const current = payment && payment.week === week ? payment : null;
    const setup = pending && pending.week === week ? pending : null;
    const labels = { money: "💵 پول بازی", gold: "🥇 گلد بازی", token: "🪙 توکن بازی" };
    const selected = current?.choice || setup?.choice || setup?.selected || "";
    const selectedAmount = current ? Number(current.amount || 0) : setup && selected ? Number(setup[selected] || setup.amount || 0) : 0;
    const status = current?.choice ? `✅ ${labels[current.choice] || current.choice}: <b>${selectedAmount.toLocaleString("en-US")}</b> (ثبت‌شده)` : setup ? (selected ? `📨 انتخاب: ${labels[selected] || selected} · ${selectedAmount.toLocaleString("en-US")}` : "📨 منتظر انتخاب نوع واریزی") : "⏳ هنوز انتخاب نکرده";
    message += `${index + 1}. <b>${escapeHtml(name)}</b>\n` +
      `🎫 رفرال: <b>${escapeHtml(String(referral || current?.referral || setup?.referral || "ثبت نشده"))}</b>\n` +
      `💰 واریزی این هفته: ${status}\n\n`;
    rows.push([{ text: `✏️ اصلاح / حذف حقوق · ${String(name).slice(0, 32)}`, callback_data: `team_member_section:payment:${id}` }]);
  }
  rows.push([{ text: "🧾 ثبت حقوق هفتگی", callback_data: "streamtime_weekly_payment" }]);
  rows.push([{ text: "🔄 بروزرسانی", callback_data: "payment_list" }, { text: "🔙 داشبورد مدیریت", callback_data: "team_dashboard" }]);
  await telegram(env, "sendMessage", { chat_id: chatId, text: message, parse_mode: "HTML", reply_markup: { inline_keyboard: rows } });
}

async function buildStreamTimeMemberStatsReport(env) {
  const members = await getStreamTimeMembers(env);
  if (!members.length) return { members: 0, message: "📈 هیچ عضوی وجود ندارد." };
  let message = "📈 <b>اطلاعات StreamTime اعضا</b>\n\n";
  let totalMinutes = 0;
  let totalStreams = 0;
  for (let index = 0; index < members.length; index++) {
    const id = Number(members[index]);
    const stats = await getTeamStats(env, id);
    const profile = await getTelegramProfile(env, id);
    const referral = await getUserReferral(env, id);
    const currentStreams = Number(stats?.streams || 0);
    const currentMinutes = Number(await getTotalStreamTime(env, id) || 0);
    const lifetime = await getLifetimeStreamStats(env, id);
    const streams = Number(lifetime.streams || 0);
    const minutes = Number(lifetime.minutes || 0);
    totalStreams += streams;
    totalMinutes += minutes;
    message += `${index + 1}️⃣ <b>${escapeHtml(getPublicUserName(profile, id))}</b>
` +
      `🔢 Referral: <b>${escapeHtml(String(referral || "ثبت نشده"))}</b>
` +
      `🎥 آمار کلی استریم: <b>${streams}</b> استریم / <b>${formatDuration(minutes)}</b>
` +
      `🔄 دوره فعلی: <b>${currentStreams}</b> استریم / <b>${formatDuration(currentMinutes)}</b>

`;
  }
  message += "━━━━━━━━━━━━\n" +
    `👥 کل اعضا: <b>${members.length}</b>\n` +
    `🎥 کل استریم‌ها: <b>${totalStreams}</b>\n` +
    `⏱ مجموع کل زمان استریم: <b>${formatDuration(totalMinutes)}</b>`;
  return { members: members.length, message };
}

async function sendStreamTimeMemberStats(env, chatId) {
  const report = await buildStreamTimeMemberStatsReport(env);
  await telegram(env, "sendMessage", {
    chat_id: chatId,
    text: report.message,
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [
        [{ text: "🔄 بروزرسانی", callback_data: "streamtime_member_stats" }],
        [{ text: "📨 ارسال گزارش داخل گروه", callback_data: "streamtime_member_stats_send_group" }],
        [{ text: "🔙 مدیریت StreamTime", callback_data: "streamtime_manage" }]
      ]
    }
  });
}

async function saveAdminState(
  env,
  userId,
  state
) {
  if (!env.BOT_STATE) {
    return;
  }
  await env.BOT_STATE.put(
    `admin:${userId}`,
    JSON.stringify(
      state
    ),
    {
      expirationTtl:
        600
    }
  );
}
async function getAdminState(
  env,
  userId
) {
  if (!env.BOT_STATE) {
    return null;
  }
  return await env.BOT_STATE.get(
    `admin:${userId}`,
    "json"
  );
}
async function deleteAdminState(
  env,
  userId
) {
  if (!env.BOT_STATE) {
    return;
  }
  await env.BOT_STATE.delete(
    `admin:${userId}`
  );
}
async function handleAdminState(
  env,
  message,
  state
) {
  const userId =
    message.from.id;
  const chatId =
    message.chat.id;
  const text = message.text ? message.text.trim() : "";
  if (state.action === "announce_template_link") {
    if (!/^https?:\/\//i.test(text)) { await telegram(env, "sendMessage", { chat_id: chatId, text: "❌ لینک معتبر بفرست که با https:// یا http:// شروع شود." }); return true; }
    state.data = state.data || {}; state.data.link = text; state.action = "announce_template_photo"; state.step = 2;
    await saveAdminState(env, userId, state);
    await telegram(env, "sendMessage", { chat_id: chatId, text: "🖼️ حالا عکس آماده اعلام استریم این عضو را همین‌جا ارسال کن." }); return true;
  }
  if (state.action === "announce_template_photo") {
    const photo = Array.isArray(message.photo) && message.photo.length ? message.photo[message.photo.length - 1].file_id : null;
    if (!photo) { await telegram(env, "sendMessage", { chat_id: chatId, text: "❌ لطفاً عکس را به‌صورت Photo ارسال کن." }); return true; }
    state.data = state.data || {}; state.data.photo = photo; state.action = "announce_template_titles"; state.step = 3;
    await saveAdminState(env, userId, state);
    await telegram(env, "sendMessage", { chat_id: chatId, text: "📝 عنوان‌های آماده را در یک پیام بنویس؛ هر عنوان را با علامت | جدا کن.\nمثال: GTA RP | شروع ماجراجویی | امشب در ایران MTA" }); return true;
  }
  if (state.action === "announce_template_titles") {
    const titles = text.split("|").map(x => x.trim()).filter(Boolean).slice(0, 8);
    const targetId = Number(state.data?.targetId);
    if (!titles.length || titles.some(x => x.length > 90)) { await telegram(env, "sendMessage", { chat_id: chatId, text: "❌ حداقل یک عنوان لازم است و هر عنوان حداکثر ۹۰ کاراکتر باشد. عنوان‌ها را با | جدا کن." }); return true; }
    if (!targetId || !state.data?.link || !state.data?.photo) { await deleteAdminState(env, userId); await telegram(env, "sendMessage", { chat_id: chatId, text: "❌ اطلاعات قالب ناقص است؛ دوباره شروع کن." }); return true; }
    await env.BOT_STATE.put(`team:announce_template:${targetId}`, JSON.stringify({ userId: targetId, link: state.data.link, photo: state.data.photo, titles, updatedAt: Date.now() }));
    await deleteAdminState(env, userId);
    await telegram(env, "sendMessage", { chat_id: chatId, text: `✅ قالب اعلام استریم ذخیره شد.\n🆔 عضو: ${targetId}\n📝 عنوان‌های آماده: ${titles.length}`, reply_markup: { inline_keyboard: [[{ text: "🧩 تنظیم قالب عضو دیگر", callback_data: "streamannounce_templates" }], [{ text: "👑 داشبورد مدیریت", callback_data: "team_dashboard" }]] } }); return true;
  }
  if (state.action === "quality_evaluator_add" && state.step === 1) {
    if (!text) { await telegram(env, "sendMessage", { chat_id: chatId, text: "❌ اسم داخل بازی را وارد کن." }); return true; }
    state.data = state.data || {};
    state.data.gameName = text.slice(0, 64);
    state.step = 2;
    await saveAdminState(env, userId, state);
    await telegram(env, "sendMessage", { chat_id: chatId, text: "🎫 رفرال این ارزیاب را وارد کن:" });
    return true;
  }
  if (state.action === "quality_evaluator_add" && state.step === 2) {
    if (!text) { await telegram(env, "sendMessage", { chat_id: chatId, text: "❌ رفرال را وارد کن؛ اگر ندارد، عبارت «ندارد» را بفرست." }); return true; }
    state.data = state.data || {};
    state.data.referral = text.slice(0, 128);
    state.step = 3;
    await saveAdminState(env, userId, state);
    await telegram(env, "sendMessage", { chat_id: chatId, text: "🆔 آیدی عددی تلگرام این ارزیاب را وارد کن:" });
    return true;
  }
  if (state.action === "quality_evaluator_add" && state.step === 3) {
    if (!/^\\d+$/.test(text)) { await telegram(env, "sendMessage", { chat_id: chatId, text: "❌ فقط آیدی عددی تلگرام را وارد کن." }); return true; }
    const targetId = Number(text);
    if (!Number.isSafeInteger(targetId) || targetId <= 0 || targetId === Number(OWNER_ID)) { await telegram(env, "sendMessage", { chat_id: chatId, text: "❌ آیدی تلگرام معتبر نیست یا مربوط به Owner است." }); return true; }
    const evaluators = await getQualityEvaluators(env);
    const record = { userId: targetId, gameName: state.data?.gameName || "", referral: state.data?.referral || "", addedAt: Date.now() };
    const index = evaluators.findIndex(item => Number(item.userId) === targetId);
    if (index >= 0) evaluators[index] = { ...evaluators[index], ...record }; else evaluators.push(record);
    await env.BOT_STATE.put("team:quality_evaluators", JSON.stringify(evaluators));
    await deleteAdminState(env, userId);
    await telegram(env, "sendMessage", { chat_id: chatId, text: `✅ دسترسی ارزیابی-only فعال شد.\n\n🎮 اسم داخل بازی: ${escapeHtml(record.gameName)}\n🎫 رفرال: ${escapeHtml(record.referral)}\n🆔 آیدی تلگرام: <code>${targetId}</code>\n\nاین حساب فقط می‌تواند ارزیابی لایو ثبت کند و به بخش‌های مدیریتی و استریم دسترسی ندارد.`, parse_mode: "HTML", reply_markup: { inline_keyboard: [[{ text: "➕ افزودن ارزیاب دیگر", callback_data: "quality_admin_add" }, { text: "📋 فهرست ارزیاب‌ها", callback_data: "quality_admin_list" }]] } });
    return true;
  }
  if (state.action === "quality_admin_remove_wait_id") {
    const targetId = Number(text);
    if (!Number.isSafeInteger(targetId) || targetId <= 0 || targetId === Number(OWNER_ID)) { await telegram(env, "sendMessage", { chat_id: chatId, text: "❌ آیدی تلگرام معتبر نیست. فقط عدد User ID را بفرست." }); return true; }
    const evaluators = await getQualityEvaluators(env);
    const next = evaluators.filter(item => Number(item.userId) !== targetId);
    await env.BOT_STATE.put("team:quality_evaluators", JSON.stringify(next));
    const admins = (await getQualityAdmins(env)).filter(id => id !== targetId);
    await env.BOT_STATE.put("team:quality_admins", JSON.stringify(admins));
    await deleteAdminState(env, userId);
    await telegram(env, "sendMessage", { chat_id: chatId, text: next.length === evaluators.length && admins.length === (await getQualityAdmins(env)).length ? "ℹ️ این آیدی در فهرست ارزیاب‌ها نبود." : `✅ دسترسی ارزیابی از آیدی ${targetId} گرفته شد.` });
    return true;
  }
  if (state.action === "legacy_salary_add_amount") {
    const amount = parsePaymentAmount(text);
    if (amount === null) { await telegram(env, "sendMessage", { chat_id: chatId, text: "❌ مبلغ نامعتبر است. فقط عدد وارد کن." }); return true; }
    const targetId = Number(state.data?.targetId), currency = state.data?.currency;
    if (!targetId || !["money", "gold", "token"].includes(currency)) { await deleteAdminState(env, userId); return true; }
    // Run migration before adding the new ledger row so any pre-existing
    // cache-only balance is preserved exactly once.
    await getLifetimePaidTotals(env, targetId);
    const paidAt = Date.now();
    const historyKey = `team:payment_history:legacy:${targetId}:${paidAt}:${crypto.randomUUID()}`;
    await env.BOT_STATE.put(historyKey, JSON.stringify({ userId: targetId, choice: currency, amount, paid: true, legacy: true, paidAt, week: "legacy" }));
    // Recalculate from the ledger after saving; never maintain totals by
    // separately adding to a cache (which caused cache/history drift).
    await getLifetimePaidTotals(env, targetId);
    await deleteAdminState(env, userId);
    await telegram(env, "sendMessage", { chat_id: chatId, text: `✅ حقوق قبلی به آمار مادام‌العمر ${targetId} اضافه شد.

${currency === "money" ? "💵 پول بازی" : currency === "gold" ? "🥇 گلد بازی" : "🪙 توکن بازی"}: ${amount.toLocaleString("en-US")}

این مورد به‌عنوان سابقه قبلی ذخیره شد و پیام پرداختی برای عضو ارسال نمی‌شود.`, reply_markup: { inline_keyboard: [[{ text: "➕ افزودن حقوق قبلی دیگر", callback_data: "legacy_salary_add" }, { text: "📋 سوابق واریزی‌ها", callback_data: "payment_list" }]] } });
    return true;
  }
  if (
    state.action ===
    "payment_salary_setup"
  ) {
    const targetId =
      Number(
        state.data?.userId
      );

    if (
      !targetId
    ) {
      await deleteAdminState(
        env,
        userId
      );
      return true;
    }

    const members =
      await getStreamTimeMembers(
        env
      );

    if (
      !members.includes(
        targetId
      )
    ) {
      await deleteAdminState(
        env,
        userId
      );
      await telegram(
        env,
        "sendMessage",
        {
          chat_id:
            chatId,
          text:
            "❌ این کاربر دیگر عضو StreamTime نیست."
        }
      );
      return true;
    }

    const amount =
      parsePaymentAmount(
        text
      );

    if (
      amount === null
    ) {
      await telegram(
        env,
        "sendMessage",
        {
          chat_id:
            chatId,
          text:
            "❌ مبلغ نامعتبر است.\n\nفقط عدد وارد کن. مثال: 2000000 یا ۲,۰۰۰,۰۰۰"
        }
      );
      return true;
    }

    if (
      state.step ===
      1
    ) {
      state.data.money =
        amount;
      state.step =
        2;

      await saveAdminState(
        env,
        userId,
        state
      );

      await telegram(
        env,
        "sendMessage",
        {
          chat_id:
            chatId,
          text:
            "🥇 مبلغ <b>گلد بازی</b> را وارد کن:\n" +
            "اگر این گزینه پرداخت نمی‌شود، <b>0</b> وارد کن.",
          parse_mode:
            "HTML"
        }
      );
      return true;
    }

    if (
      state.step ===
      2
    ) {
      state.data.gold =
        amount;
      state.step =
        3;

      await saveAdminState(
        env,
        userId,
        state
      );

      await telegram(
        env,
        "sendMessage",
        {
          chat_id:
            chatId,
          text:
            "🪙 مبلغ <b>توکن بازی</b> را وارد کن:\n" +
            "اگر این گزینه پرداخت نمی‌شود، <b>0</b> وارد کن.",
          parse_mode:
            "HTML"
        }
      );
      return true;
    }

    state.data.token =
      amount;

    const referral =
      await getUserReferral(
        env,
        targetId
      );

    const pending = {
      ownerId:
        Number(
          OWNER_ID
        ),
      userId:
        targetId,
      referral:
        referral || "",
      money:
        Number(
          state.data.money || 0
        ),
      gold:
        Number(
          state.data.gold || 0
        ),
      token:
        amount,
      selected:
        null,
      createdAt:
        Date.now(),
      week:
        getPaymentWeekKey()
    };

    await env.BOT_STATE.put(
      `team:salary_pending:${targetId}`,
      JSON.stringify(
        pending
      ),
      {
        expirationTtl:
          604800
      }
    );

    await deleteAdminState(
      env,
      userId
    );

    const profile =
      await getTelegramProfile(
        env,
        targetId
      );

    const name =
      getPublicUserName(
        profile,
        targetId
      );

    const choiceMessageResult = await telegram(
      env,
      "sendMessage",
      {
        chat_id:
          targetId,
        text:
          `💰 <b>حقوق این هفته شما</b>\n\n` +
          `👤 ${escapeHtml(name)}\n` +
          `🔢 Referral: <b>${escapeHtml(String(referral || "ثبت نشده"))}</b>\n\n` +
          `💵 پول بازی: <b>${pending.money.toLocaleString("en-US")}</b>\n` +
          `🥇 گلد بازی: <b>${pending.gold.toLocaleString("en-US")}</b>\n` +
          `🪙 توکن بازی: <b>${pending.token.toLocaleString("en-US")}</b>\n\n` +
          "یکی از روش‌های دریافت حقوق را انتخاب کن:",
        parse_mode:
          "HTML",
        reply_markup: {
          inline_keyboard: [
            [
              {
                text:
                  `💵 پول بازی — ${pending.money.toLocaleString("en-US")}`,
                callback_data:
                  `payment_choice:${targetId}:money`
              }
            ],
            [
              {
                text:
                  `🥇 گلد بازی — ${pending.gold.toLocaleString("en-US")}`,
                callback_data:
                  `payment_choice:${targetId}:gold`
              }
            ],
            [
              {
                text:
                  `🪙 توکن بازی — ${pending.token.toLocaleString("en-US")}`,
                callback_data:
                  `payment_choice:${targetId}:token`
              }
            ]
          ]
        }
      }
    );
    if (choiceMessageResult?.ok && choiceMessageResult.result?.message_id) {
      pending.choiceMessageId = choiceMessageResult.result.message_id;
      await env.BOT_STATE.put(`team:salary_pending:${targetId}`, JSON.stringify(pending), { expirationTtl: 604800 });
    }

    const sent =
      await telegram(
        env,
        "sendMessage",
        {
          chat_id:
            chatId,
          text:
            `📨 <b>درخواست انتخاب حقوق ارسال شد.</b>\n\n` +
            `${formatTelegramProfile(profile, targetId)}\n\n` +
            `💵 پول بازی: <b>${pending.money.toLocaleString("en-US")}</b>\n` +
            `🥇 گلد: <b>${pending.gold.toLocaleString("en-US")}</b>\n` +
            `🪙 توکن: <b>${pending.token.toLocaleString("en-US")}</b>\n\n` +
            "⏳ منتظر انتخاب کاربر هستیم.",
          parse_mode:
            "HTML"
        }
      );

    if (
      !sent ||
      !sent.ok
    ) {
      await env.BOT_STATE.put(
        `team:salary_pending:${targetId}`,
        JSON.stringify(
          {
            ...pending,
            selected:
              null,
            sendFailed:
              true
          }
        ),
        {
          expirationTtl:
            604800
        }
      );
      await telegram(
        env,
        "sendMessage",
        {
          chat_id:
            chatId,
          text:
            "⚠️ حقوق ثبت شد، اما پیام به کاربر ارسال نشد. احتمالاً کاربر بات را Start نکرده یا دسترسی پیام وجود ندارد."
        }
      );
    }

    return true;
  }

  if (
    state.action ===
      "support_forum_set" &&
    state.step ===
      1
  ) {
    if (!text || !/^-?\d+$/.test(text)) {
      await telegram(env, "sendMessage", {
        chat_id: chatId,
        text: "❌ Chat ID معتبر نیست. مثال: -1001234567890"
      });
      return true;
    }
    const targetChatId = Number(text);
    const info = await telegram(env, "getChat", { chat_id: targetChatId });
    if (!(info && info.ok && info.result)) {
      await telegram(env, "sendMessage", {
        chat_id: chatId,
        text: "❌ گروه پیدا نشد یا بات به آن دسترسی ندارد."
      });
      return true;
    }
    if (info.result.type !== "supergroup" || !info.result.is_forum) {
      await telegram(env, "sendMessage", {
        chat_id: chatId,
        text: "❌ این گروه باید Supergroup باشد و Topics/Forum در آن فعال باشد."
      });
      return true;
    }
    await saveSupportForumChatId(env, targetChatId);
    await deleteAdminState(env, userId);
    await telegram(env, "sendMessage", {
      chat_id: chatId,
      text: "✅ چت Support با موفقیت تنظیم شد. از این به بعد برای هر کاربر یک Topic جدا ساخته می‌شود."
    });
    await sendSupportForumManagementMenu(env, chatId);
    return true;
  }
  if (
    state.action ===
      "support_admin_add" &&
    state.step ===
      1
  ) {
    if (
      !text ||
      !/^\d+$/.test(text)
    ) {
      await telegram(
        env,
        "sendMessage",
        {
          chat_id:
            chatId,
          text:
            "❌ لطفاً Telegram User ID را فقط به صورت عدد وارد کنید.\n\n" +
            "مثال:\n" +
            "1299357422"
        }
      );
      return true;
    }
    const targetId =
      Number(text);
    if (
      targetId ===
      Number(OWNER_ID)
    ) {
      await deleteAdminState(
        env,
        userId
      );
      await telegram(
        env,
        "sendMessage",
        {
          chat_id:
            chatId,
          text:
            "❌ Owner نیازی به ادمین Support ندارد."
        }
      );
      return true;
    }
    const added =
      await addSupportAdmin(
        env,
        targetId
      );
    await deleteAdminState(
      env,
      userId
    );
    if (!added) {
      await telegram(
        env,
        "sendMessage",
        {
          chat_id:
            chatId,
          text:
            "⚠️ این User ID قبلاً به عنوان ادمین Support ثبت شده است."
        }
      );
      return true;
    }
    const profile =
      await getTelegramProfile(
        env,
        targetId
      );
    await telegram(
      env,
      "sendMessage",
      {
        chat_id:
          chatId,
        text:
          "✅ <b>ادمین Support با موفقیت اضافه شد.</b>\n\n" +
          `${formatTelegramProfile(profile, targetId)}\n\n` +
          "از این به بعد پیام‌های Support برای این شخص نیز ارسال می‌شود.\n" +
          "این شخص فقط امکان مشاهده و پاسخ به پیام‌های Support را دارد.",
        parse_mode:
          "HTML",
        reply_markup: {
          inline_keyboard: [
            [
              {
                text:
                  "👮 مدیریت ادمین Support",
                callback_data:
                  "support_admin_manage"
              }
            ],
            [
              {
                text:
                  "🏠 منوی اصلی",
                callback_data:
                  "home"
              }
            ]
          ]
        }
      }
    );
    return true;
  }
  if (
    state.action ===
      "support_admin_remove" &&
    state.step ===
      1
  ) {
    if (
      !text ||
      !/^\d+$/.test(text)
    ) {
      await telegram(
        env,
        "sendMessage",
        {
          chat_id:
            chatId,
          text:
            "❌ لطفاً Telegram User ID را فقط به صورت عدد وارد کنید."
        }
      );
      return true;
    }
    const targetId =
      Number(text);
    const removed =
      await removeSupportAdmin(
        env,
        targetId
      );
    await deleteAdminState(
      env,
      userId
    );
    if (!removed) {
      await telegram(
        env,
        "sendMessage",
        {
          chat_id:
            chatId,
          text:
            "⚠️ این User ID در لیست ادمین‌های Support وجود ندارد."
        }
      );
      return true;
    }
    await telegram(
      env,
      "sendMessage",
      {
        chat_id:
          chatId,
        text:
          "✅ ادمین Support حذف شد.\n\n" +
          `🆔 User ID: ${targetId}\n\n` +
          "از این به بعد پیام‌های Support برای این شخص ارسال نمی‌شود."
      }
    );
    return true;
  }
  if (state.action === "streamtime_group_text" && state.step === 1) {
    if (!text) {
      await telegram(env, "sendMessage", { chat_id: chatId, text: "❌ لطفاً متن پیام را وارد کن." });
      return true;
    }
    const targetChatId = String(state.data?.chatId || "");
    const groups = await getStreamTimeGroups(env);
    const group = groups.find(g => String(g.chatId) === targetChatId);
    if (!group) {
      await deleteAdminState(env, userId);
      await telegram(env, "sendMessage", { chat_id: chatId, text: "❌ این گروه دیگر در لیست مقصدها وجود ندارد." });
      return true;
    }
    const result = await telegram(env, "sendMessage", { chat_id: group.chatId, text });
    await deleteAdminState(env, userId);
    if (result && result.ok) {
      await telegram(env, "sendMessage", {
        chat_id: chatId,
        text: `✅ متن با موفقیت در گروه «${escapeHtml(group.title)}» ارسال شد.`,
        parse_mode: "HTML",
        reply_markup: { inline_keyboard: [[{ text: "📨 ارسال متن دیگر", callback_data: "streamtime_group_text" }], [{ text: "🔙 مدیریت گروه‌ها", callback_data: "streamtime_group_manage" }]] }
      });
    } else {
      await telegram(env, "sendMessage", { chat_id: chatId, text: "❌ ارسال پیام به گروه ناموفق بود. مطمئن شو بات هنوز داخل گروه است و اجازه ارسال پیام دارد." });
    }
    return true;
  }
  if (
    state.action ===
      "streamtime_group_add" &&
    state.step ===
      1
  ) {
    if (
      !text
    ) {
      await telegram(
        env,
        "sendMessage",
        {
          chat_id:
            chatId,
          text:
            "❌ لطفاً Chat ID گروه را وارد کنید.\n\n" +
            "مثال:\n" +
            "-1001234567890"
        }
      );
      return true;
    }
    await telegram(
      env,
      "sendMessage",
      {
        chat_id:
          chatId,
        text:
          "⏳ در حال بررسی گروه..."
      }
    );
    const resolved =
      await resolveStreamTimeGroup(
        env,
        text
      );
    if (!resolved) {
      await telegram(
        env,
        "sendMessage",
        {
          chat_id:
            chatId,
          text:
            "❌ گروه پیدا نشد یا بات به آن دسترسی ندارد.\n\n" +
            "Chat ID را درست وارد کن.\n\n" +
            "مثال:\n" +
            "-1001234567890\n\n" +
            "مطمئن شو بات داخل گروه عضو باشد."
        }
      );
      return true;
    }
    if (
      resolved.type !==
        "group" &&
      resolved.type !==
        "supergroup"
    ) {
      await telegram(
        env,
        "sendMessage",
        {
          chat_id:
            chatId,
          text:
            "❌ این Chat یک گروه Telegram نیست."
        }
      );
      return true;
    }
    const result =
      await addStreamTimeGroup(
        env,
        resolved
      );
    await deleteAdminState(
      env,
      userId
    );
    if (
      result.added
    ) {
      await telegram(
        env,
        "sendMessage",
        {
          chat_id:
            chatId,
          text:
            "✅ <b>گروه StreamTime با موفقیت اضافه شد.</b>\n\n" +
            `📡 ${escapeHtml(resolved.title)}\n` +
            `🆔 ${escapeHtml(resolved.chatId)}\n` +
            `📌 ${escapeHtml(resolved.type)}\n\n` +
            `👥 تعداد گروه‌ها: ${result.groups.length}`,
          parse_mode:
            "HTML",
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text:
                    "📋 لیست گروه‌ها",
                  callback_data:
                    "streamtime_group_list"
                }
              ],
              [
                {
                  text:
                    "🔙 مدیریت گروه‌ها",
                  callback_data:
                    "streamtime_group_manage"
                }
              ]
            ]
          }
        }
      );
    } else {
      await telegram(
        env,
        "sendMessage",
        {
          chat_id:
            chatId,
          text:
            "⚠️ این گروه قبلاً ثبت شده است.\n\n" +
            `📡 ${resolved.title}\n` +
            `🆔 ${resolved.chatId}`
        }
      );
    }
    return true;
  }
  if (
    state.action ===
      "streamtime_group_remove" &&
    state.step ===
      1
  ) {
    if (
      !text ||
      !/^-?\d+$/.test(text)
    ) {
      await telegram(
        env,
        "sendMessage",
        {
          chat_id:
            chatId,
          text:
            "❌ لطفاً Chat ID صحیح وارد کن.\n\n" +
            "مثال:\n" +
            "-1001234567890"
        }
      );
      return true;
    }
    const removed =
      await removeStreamTimeGroup(
        env,
        text
      );
    await deleteAdminState(
      env,
      userId
    );
    await telegram(
      env,
      "sendMessage",
      {
        chat_id:
          chatId,
        text:
          removed
            ? "✅ گروه StreamTime با موفقیت حذف شد."
            : "⚠️ این گروه در لیست وجود نداشت."
      }
    );
    return true;
  }
  if (
    state.action ===
      "time_adjust" &&
    state.step ===
      1
  ) {
    if (
      !text
    ) {
      await telegram(
        env,
        "sendMessage",
        {
          chat_id:
            chatId,
          text:
            "❌ مقدار زمان را وارد کنید.\n\n" +
            "مثال:\n" +
            "2\n" +
            "2:30\n" +
            "0:45"
        }
      );
      return true;
    }
    const duration =
      parseDuration(
        text
      );
    if (
      duration ===
      null
    ) {
      await telegram(
        env,
        "sendMessage",
        {
          chat_id:
            chatId,
          text:
            "❌ فرمت زمان اشتباه است.\n\n" +
            "فرمت صحیح:\n" +
            "2\n" +
            "2:30\n" +
            "0:45"
        }
      );
      return true;
    }
    const targetId =
      Number(
        state.data?.userId
      );
    if (!targetId) {
      await deleteAdminState(
        env,
        userId
      );
      await telegram(
        env,
        "sendMessage",
        {
          chat_id:
            chatId,
          text:
            "❌ اطلاعات کاربر پیدا نشد. دوباره تلاش کنید."
        }
      );
      return true;
    }
    const members =
      await getStreamTimeMembers(
        env
      );
    if (
      !members.includes(
        targetId
      )
    ) {
      await deleteAdminState(
        env,
        userId
      );
      await telegram(
        env,
        "sendMessage",
        {
          chat_id:
            chatId,
          text:
            "❌ این کاربر دیگر عضو StreamTime نیست."
        }
      );
      return true;
    }
    const current =
      await getTotalStreamTime(
        env,
        targetId
      );
    let newTotal =
      current;
    if (
      state.data?.mode ===
      "add"
    ) {
      newTotal =
        current +
        duration;
    } else {
      newTotal =
        Math.max(
          0,
          current -
          duration
        );
    }
    await setStreamTime(
      env,
      targetId,
      newTotal
    );
    await deleteAdminState(
      env,
      userId
    );
    const profile =
      await getTelegramProfile(
        env,
        targetId
      );
    const modeText =
      state.data?.mode ===
        "add"
        ? "افزایش"
        : "کاهش";
    await telegram(
      env,
      "sendMessage",
      {
        chat_id:
          chatId,
        text:
          `✅ <b>${modeText} تایم انجام شد.</b>\n\n` +
          `${formatTelegramProfile(profile, targetId)}\n\n` +
          `⏱️ تایم قبلی: ${formatDuration(current)}\n` +
          `🕐 تغییر: ${formatDuration(duration)}\n` +
          `✅ تایم جدید: <b>${formatDuration(newTotal)}</b>`,
        parse_mode:
          "HTML",
        reply_markup: {
          inline_keyboard: [
            [
              {
                text:
                  "🕐 مدیریت همین عضو",
                callback_data:
                  `streamtime_time_member:${targetId}`
              }
            ],
            [
              {
                text:
                  "🔙 لیست اعضا",
                callback_data:
                  "streamtime_time_manage"
              }
            ],
            [
              {
                text:
                  "🏠 منوی اصلی",
                callback_data:
                  "home"
              }
            ]
          ]
        }
      }
    );
    return true;
  }
  if (state.action === "manual_stream_add" || state.action === "manual_stream_remove") {
    const duration = parseDuration(text);
    if (duration === null || duration <= 0) {
      await telegram(env, "sendMessage", { chat_id: chatId, text: "❌ زمان نامعتبر است. مثال: 2 یا 2:30" });
      return true;
    }
    const targetId = Number(state.data?.userId);
    const members = await getStreamTimeMembers(env);
    if (!members.includes(targetId)) {
      await deleteAdminState(env, userId);
      await telegram(env, "sendMessage", { chat_id: chatId, text: "❌ این کاربر دیگر عضو StreamTime نیست." });
      return true;
    }
    const current = await getTotalStreamTime(env, targetId);
    const isManualAdd = state.action === "manual_stream_add";
    const next = isManualAdd ? current + duration : Math.max(0, current - duration);

    // Manual additions count toward lifetime minutes too, but do not fabricate a stream count.
    // Initialize before changing current time to avoid migration double-counting.
    if (isManualAdd) {
      const lifetime = await ensureLifetimeStreamStats(env, targetId);
      lifetime.minutes = Math.max(0, Number(lifetime.minutes || 0)) + duration;
      await env.BOT_STATE.put(`team:lifetime_streams:${Number(targetId)}`, JSON.stringify(lifetime));
    }
    await setStreamTime(env, targetId, next);
    await deleteAdminState(env, userId);
    await telegram(env, "sendMessage", { chat_id: chatId, text: state.action === "manual_stream_add" ? `✅ StreamTime ثبت شد.\n\n⏱️ تایم قبلی: ${formatDuration(current)}\n➕ اضافه شد: ${formatDuration(duration)}\n⏱️ تایم جدید: <b>${formatDuration(next)}</b>` : `✅ StreamTime حذف شد.\n\n⏱️ تایم قبلی: ${formatDuration(current)}\n➖ حذف شد: ${formatDuration(duration)}\n⏱️ تایم جدید: <b>${formatDuration(next)}</b>`, parse_mode: "HTML" });
    return true;
  }

  if (
    state.action ===
      "time_set" &&
    state.step ===
      1
  ) {
    if (
      !text
    ) {
      await telegram(
        env,
        "sendMessage",
        {
          chat_id:
            chatId,
          text:
            "❌ تایم جدید را وارد کنید.\n\n" +
            "مثال:\n" +
            "5\n" +
            "5:30\n" +
            "0\n" +
            "0:45"
        }
      );
      return true;
    }
    const duration =
      parseDuration(
        text
      );
    if (
      duration ===
      null
    ) {
      await telegram(
        env,
        "sendMessage",
        {
          chat_id:
            chatId,
          text:
            "❌ فرمت زمان اشتباه است.\n\n" +
            "فرمت صحیح:\n" +
            "5\n" +
            "5:30\n" +
            "0\n" +
            "0:45"
        }
      );
      return true;
    }
    const targetId =
      Number(
        state.data?.userId
      );
    if (!targetId) {
      await deleteAdminState(
        env,
        userId
      );
      await telegram(
        env,
        "sendMessage",
        {
          chat_id:
            chatId,
          text:
            "❌ اطلاعات کاربر پیدا نشد. دوباره تلاش کنید."
        }
      );
      return true;
    }
    const members =
      await getStreamTimeMembers(
        env
      );
    if (
      !members.includes(
        targetId
      )
    ) {
      await deleteAdminState(
        env,
        userId
      );
      await telegram(
        env,
        "sendMessage",
        {
          chat_id:
            chatId,
          text:
            "❌ این کاربر دیگر عضو StreamTime نیست."
        }
      );
      return true;
    }
    const current =
      await getTotalStreamTime(
        env,
        targetId
      );
    await setStreamTime(
      env,
      targetId,
      duration
    );
    await deleteAdminState(
      env,
      userId
    );
    const profile =
      await getTelegramProfile(
        env,
        targetId
      );
    await telegram(
      env,
      "sendMessage",
      {
        chat_id:
          chatId,
        text:
          "✅ <b>تایم جدید با موفقیت ثبت شد.</b>\n\n" +
          `${formatTelegramProfile(profile, targetId)}\n\n` +
          `⏱️ تایم قبلی: ${formatDuration(current)}\n` +
          `🕐 تایم جدید: <b>${formatDuration(duration)}</b>`,
        parse_mode:
          "HTML",
        reply_markup: {
          inline_keyboard: [
            [
              {
                text:
                  "🕐 مدیریت همین عضو",
                callback_data:
                  `streamtime_time_member:${targetId}`
              }
            ],
            [
              {
                text:
                  "🔙 لیست اعضا",
                callback_data:
                  "streamtime_time_manage"
              }
            ],
            [
              {
                text:
                  "🏠 منوی اصلی",
                callback_data:
                  "home"
              }
            ]
          ]
        }
      }
    );
    return true;
  }
  if (
    state.action ===
      "streamannounce_add" &&
    state.step ===
      1
  ) {
    if (!text) {
      await telegram(
        env,
        "sendMessage",
        {
          chat_id:
            chatId,
          text:
            "❌ لطفاً Chat ID یا Username مقصد را وارد کنید."
        }
      );
      return true;
    }
    await telegram(
      env,
      "sendMessage",
      {
        chat_id:
          chatId,
        text:
          "⏳ در حال بررسی مقصد..."
      }
    );
    const resolved =
      await resolveStreamAnnounceChat(
        env,
        text
      );
    if (!resolved) {
      await telegram(
        env,
        "sendMessage",
        {
          chat_id:
            chatId,
          text:
            "❌ مقصد پیدا نشد یا بات به آن دسترسی ندارد.\n\n" +
            "Chat ID صحیح را وارد کن.\n\n" +
            "مثال:\n" +
            "-1001234567890\n\n" +
            "یا برای کانال عمومی:\n" +
            "@ChannelUsername\n\n" +
            "همچنین مطمئن شو بات داخل مقصد عضو باشد."
        }
      );
      return true;
    }
    const result =
      await addStreamAnnounceChat(
        env,
        resolved.chatId,
        resolved.title,
        resolved.type
      );
    await deleteAdminState(
      env,
      userId
    );
    if (
      result.added
    ) {
      await telegram(
        env,
        "sendMessage",
        {
          chat_id:
            chatId,
          text:
            "✅ <b>مقصد با موفقیت اضافه شد.</b>\n\n" +
            `📢 ${escapeHtml(resolved.title)}\n` +
            `🆔 ${escapeHtml(resolved.chatId)}\n` +
            `📌 نوع: ${escapeHtml(resolved.type)}\n\n` +
            `📣 تعداد مقصدهای فعال: ${result.chats.length}`,
          parse_mode:
            "HTML",
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text:
                    "📋 لیست مقصدها",
                  callback_data:
                    "streamannounce_list"
                }
              ],
              [
                {
                  text:
                    "🔙 مدیریت مقصدها",
                  callback_data:
                    "streamannounce_manage"
                }
              ]
            ]
          }
        }
      );
    } else {
      await telegram(
        env,
        "sendMessage",
        {
          chat_id:
            chatId,
          text:
            "⚠️ این مقصد قبلاً ثبت شده است.\n\n" +
            `📢 ${resolved.title}\n` +
            `🆔 ${resolved.chatId}`
        }
      );
    }
    return true;
  }
  if (
    state.action ===
      "streamannounce_remove" &&
    state.step ===
      1
  ) {
    if (
      !text ||
      !/^-?\d+$/.test(text)
    ) {
      await telegram(
        env,
        "sendMessage",
        {
          chat_id:
            chatId,
          text:
            "❌ لطفاً Chat ID را صحیح وارد کنید.\n\n" +
            "مثال:\n" +
            "-1001234567890"
        }
      );
      return true;
    }
    const removed =
      await removeStreamAnnounceChat(
        env,
        text
      );
    await deleteAdminState(
      env,
      userId
    );
    if (
      removed
    ) {
      const chats =
        await getStreamAnnounceChats(
          env
        );
      await telegram(
        env,
        "sendMessage",
        {
          chat_id:
            chatId,
          text:
            "✅ <b>مقصد با موفقیت حذف شد.</b>\n\n" +
            `🆔 ${escapeHtml(text)}\n\n` +
            `📢 مقصدهای باقی‌مانده: ${chats.length}`,
          parse_mode:
            "HTML",
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text:
                    "📋 لیست مقصدها",
                  callback_data:
                    "streamannounce_list"
                }
              ],
              [
                {
                  text:
                    "🔙 مدیریت مقصدها",
                  callback_data:
                    "streamannounce_manage"
                }
              ]
            ]
          }
        }
      );
    } else {
      await telegram(
        env,
        "sendMessage",
        {
          chat_id:
            chatId,
          text:
            "⚠️ این Chat ID در لیست مقصدها وجود ندارد."
        }
      );
    }
    return true;
  }
  if (
    state.action ===
      "broadcast" &&
    state.step ===
      1
  ) {
    if (!text) {
      await telegram(
        env,
        "sendMessage",
        {
          chat_id:
            chatId,
          text:
            "❌ لطفاً متن پیام را وارد کنید."
        }
      );
      return true;
    }
    await telegram(
      env,
      "sendMessage",
      {
        chat_id:
          chatId,
        text:
          "📣 پیام دریافت شد.\n\n" +
          "⏳ در حال ارسال برای کاربران..."
      }
    );
    await deleteAdminState(
      env,
      userId
    );
    const result =
      await broadcastMessageToAll(
        env,
        text
      );
    await telegram(
      env,
      "sendMessage",
      {
        chat_id:
          chatId,
        text:
          "📣 <b>ارسال پیام همگانی انجام شد.</b>\n\n" +
          `👥 تعداد کل کاربران: ${result.total}\n` +
          `✅ ارسال موفق: ${result.success}\n` +
          `❌ ارسال ناموفق: ${result.failed}\n\n` +
          "کاربرانی که ربات را بلاک کرده باشند یا امکان دریافت پیام نداشته باشند، در بخش ناموفق قرار می‌گیرند.",
        parse_mode:
          "HTML",
        reply_markup: {
          inline_keyboard: [
            [
              {
                text:
                  "🔙 مدیریت StreamTime",
                callback_data:
                  "streamtime_manage"
              }
            ],
            [
              {
                text:
                  "🏠 منوی اصلی",
                callback_data:
                  "home"
              }
            ]
          ]
        }
      }
    );
    return true;
  }
  if (
    state.action ===
      "payment" &&
    state.step ===
      3
  ) {
    if (!text) {
      await telegram(
        env,
        "sendMessage",
        {
          chat_id:
            chatId,
          text:
            "❌ لطفاً متن پیام را وارد کنید."
        }
      );
      return true;
    }
    const targetId =
      Number(
        state.data?.userId
      );
    if (!targetId) {
      await deleteAdminState(
        env,
        userId
      );
      await telegram(
        env,
        "sendMessage",
        {
          chat_id:
            chatId,
          text:
            "❌ اطلاعات کاربر پیدا نشد. دوباره تلاش کنید."
        }
      );
      return true;
    }
    const members =
      await getStreamTimeMembers(
        env
      );
    if (
      !members.includes(
        targetId
      )
    ) {
      await deleteAdminState(
        env,
        userId
      );
      await telegram(
        env,
        "sendMessage",
        {
          chat_id:
            chatId,
          text:
            "❌ این کاربر دیگر عضو StreamTime نیست."
        }
      );
      return true;
    }
    const result =
      await telegram(
        env,
        "sendMessage",
        {
          chat_id:
            targetId,
          text:
            text
        }
      );
    await deleteAdminState(
      env,
      userId
    );
    if (
      result &&
      result.ok
    ) {
      await telegram(
        env,
        "sendMessage",
        {
          chat_id:
            chatId,
          text:
            "✅ <b>پیام با موفقیت ارسال شد.</b>\n\n" +
            `🆔 User ID: ${targetId}\n\n` +
            "✏️ پیام دلخواه برای کاربر ارسال شد.",
          parse_mode:
            "HTML"
        }
      );
    } else {
      await telegram(
        env,
        "sendMessage",
        {
          chat_id:
            chatId,
          text:
            "❌ ارسال پیام انجام نشد.\n\n" +
            "ممکن است کاربر ربات را بلاک کرده باشد یا هنوز با ربات گفتگو نکرده باشد."
        }
      );
    }
    return true;
  }
  if (state.action === "game_name_edit") {
    const targetId = Number(state.data?.userId);
    const gameName = text.trim().slice(0, 64);
    if (!targetId || !gameName) {
      await telegram(env, "sendMessage", { chat_id: chatId, text: "❌ اسم گیم نمی‌تواند خالی باشد. یک اسم معتبر بفرست." });
      return true;
    }
    await saveTeamGameName(env, targetId, gameName);
    await deleteAdminState(env, userId);
    await telegram(env, "sendMessage", { chat_id: chatId, text: `✅ اسم گیم عضو به «${escapeHtml(gameName)}» تغییر کرد.`, parse_mode: "HTML", reply_markup: { inline_keyboard: [[{ text: "👤 پرونده عضو", callback_data: `team_member_card:${targetId}` }], [{ text: "👥 لیست اعضا", callback_data: "team_members_hub" }]] } });
    return true;
  }
  if (state.action === "add" && (!state.step || state.step === 1)) {
    if (!text) {
      await telegram(env, "sendMessage", { chat_id: chatId, text: "❌ لطفاً اسم گیم / نام نمایشی را وارد کن." });
      return true;
    }
    state.data = state.data || {};
    state.data.gameName = text.slice(0, 64);
    state.step = 2;
    await saveAdminState(env, userId, state);
    await telegram(env, "sendMessage", { chat_id: chatId, text: "✅ اسم گیم ذخیره شد.\n\nمرحله 2 از 3\n\n🎫 رفرال این عضو را وارد کن:" });
    return true;
  }
  if (state.action === "add" && state.step === 2) {
    if (!text) {
      await telegram(env, "sendMessage", { chat_id: chatId, text: "❌ لطفاً رفرال را وارد کن." });
      return true;
    }
    state.data = state.data || {};
    state.data.referral = text.slice(0, 128);
    state.step = 3;
    await saveAdminState(env, userId, state);
    await telegram(env, "sendMessage", { chat_id: chatId, text: "✅ رفرال ذخیره شد.\n\nمرحله 3 از 3\n\n🆔 حالا آیدی عددی تلگرام عضو را وارد کن:\nمثال: <code>1299357422</code>", parse_mode: "HTML" });
    return true;
  }
  if (state.action === "add" && state.step === 3) {
    if (!text || !/^\d+$/.test(text)) {
      await telegram(env, "sendMessage", { chat_id: chatId, text: "❌ لطفاً آیدی عددی تلگرام را فقط به‌صورت عدد وارد کن. مثال: 1299357422" });
      return true;
    }
    const targetId = Number(text);
    if (!Number.isSafeInteger(targetId) || targetId <= 0 || targetId === Number(OWNER_ID)) {
      await telegram(env, "sendMessage", { chat_id: chatId, text: "❌ آیدی تلگرام معتبر نیست یا مربوط به Owner است." });
      return true;
    }
    const members = await getStreamTimeMembers(env);
    if (members.includes(targetId)) {
      await deleteAdminState(env, userId);
      await telegram(env, "sendMessage", { chat_id: chatId, text: "⚠️ این User ID قبلاً در لیست وجود دارد." });
      return true;
    }
    members.push(targetId);
    await saveStreamTimeMembers(env, members);
    await saveTeamGameName(env, targetId, state.data?.gameName || "");
    await saveUserReferral(env, targetId, state.data?.referral || "");
    await getTelegramProfile(env, targetId);
    await deleteAdminState(env, userId);
    const profile = await getTelegramProfile(env, targetId);
    await telegram(env, "sendMessage", { chat_id: chatId, text: `✅ عضو با موفقیت اضافه شد.\n\n🎮 اسم گیم: <b>${escapeHtml(String(state.data?.gameName || ""))}</b>\n🎫 رفرال: <b>${escapeHtml(String(state.data?.referral || ""))}</b>\n🆔 آیدی تلگرام: <code>${targetId}</code>\n\nاکنون این شخص می‌تواند StreamTime ثبت کند.`, parse_mode: "HTML", reply_markup: { inline_keyboard: [[{ text: "👤 پرونده عضو", callback_data: `team_member_card:${targetId}` }], [{ text: "👥 مدیریت اعضا", callback_data: "team_members_hub" }]] } });
    return true;
  }
  if (
    state.action ===
    "remove"
  ) {
    if (
      !text ||
      !/^\d+$/.test(text)
    ) {
      await telegram(
        env,
        "sendMessage",
        {
          chat_id:
            chatId,
          text:
            "❌ لطفاً Telegram User ID را فقط به صورت عدد وارد کنید.\n\n" +
            "مثال:\n" +
            "1299357422"
        }
      );
      return true;
    }
    const targetId =
      Number(text);
    if (
      targetId ===
      Number(OWNER_ID)
    ) {
      await deleteAdminState(
        env,
        userId
      );
      await telegram(
        env,
        "sendMessage",
        {
          chat_id:
            chatId,
          text:
            "❌ Owner را نمی‌توان حذف کرد."
        }
      );
      return true;
    }
    const members =
      await getStreamTimeMembers(
        env
      );
    if (
      !members.includes(
        targetId
      )
    ) {
      await deleteAdminState(
        env,
        userId
      );
      await telegram(
        env,
        "sendMessage",
        {
          chat_id:
            chatId,
          text:
            "⚠️ این User ID در لیست وجود ندارد."
        }
      );
      return true;
    }
    const newMembers =
      members.filter(
        id =>
          Number(id) !==
          targetId
      );
    await saveStreamTimeMembers(
      env,
      newMembers
    );
    await deleteUserReferral(env, targetId);
    await deleteStreamAnnouncementAccess(env, targetId);
    await removeSupportAdmin(env, targetId);
    const profileAllowed = await getProfileAllowedUsers(env);
    await saveProfileAllowedUsers(env, profileAllowed.filter(id => Number(id) !== targetId));
    const qualityAdmins = await getQualityAdmins(env);
    await env.BOT_STATE.put("team:quality_admins", JSON.stringify(qualityAdmins.filter(id => Number(id) !== targetId)));
    await deleteAdminState(env, userId);
    await telegram(
      env,
      "sendMessage",
      {
        chat_id:
          chatId,
        text:
          "✅ عضو حذف شد.\n\n" +
          `🆔 User ID: ${targetId}`
      }
    );
    return true;
  }
  if (
    state.action ===
    "total"
  ) {
    if (
      !text ||
      !/^\d+$/.test(text)
    ) {
      await telegram(
        env,
        "sendMessage",
        {
          chat_id:
            chatId,
          text:
            "❌ لطفاً Telegram User ID را فقط به صورت عدد وارد کنید."
        }
      );
      return true;
    }
    const targetId =
      Number(text);
    const total =
      await getTotalStreamTime(
        env,
        targetId
      );
    const profile =
      await getTelegramProfile(
        env,
        targetId
      );
    const referral =
      await getUserReferral(
        env,
        targetId
      );
    await deleteAdminState(
      env,
      userId
    );
    await telegram(
      env,
      "sendMessage",
      {
        chat_id:
          chatId,
        text:
          "⏱️ مجموع تایم استریم\n\n" +
          `${formatTelegramProfile(profile, targetId)}\n` +
          `🎫 Referral: ${referral || "ثبت نشده"}\n\n` +
          `⌛ ${formatDuration(total)}`
      }
    );
    return true;
  }
  if (
    state.action ===
      "referral" &&
    (
      !state.step ||
      state.step === 1
    )
  ) {
    if (
      !text ||
      !/^\d+$/.test(text)
    ) {
      await telegram(
        env,
        "sendMessage",
        {
          chat_id:
            chatId,
          text:
            "❌ لطفاً Telegram User ID را فقط به صورت عدد وارد کنید."
        }
      );
      return true;
    }
    const targetId =
      Number(text);
    const members =
      await getStreamTimeMembers(
        env
      );
    if (
      !members.includes(
        targetId
      )
    ) {
      await deleteAdminState(
        env,
        userId
      );
      await telegram(
        env,
        "sendMessage",
        {
          chat_id:
            chatId,
          text:
            "⚠️ این User ID در لیست اعضای StreamTime وجود ندارد."
        }
      );
      return true;
    }
    const currentReferral =
      await getUserReferral(
        env,
        targetId
      );
    state.step =
      2;
    state.data =
      state.data ||
      {};
    state.data.userId =
      targetId;
    await saveAdminState(
      env,
      userId,
      state
    );
    await telegram(
      env,
      "sendMessage",
      {
        chat_id:
          chatId,
        text:
          "🎫 ثبت / تغییر Referral\n\n" +
          `🆔 User ID: ${targetId}\n` +
          `Referral فعلی: ${currentReferral || "ثبت نشده"}\n\n` +
          "Referral جدید را وارد کنید:"
      }
    );
    return true;
  }
  if (
    state.action ===
      "referral" &&
    state.step ===
      2
  ) {
    if (!text) {
      await telegram(
        env,
        "sendMessage",
        {
          chat_id:
            chatId,
          text:
            "❌ لطفاً Referral را وارد کنید."
        }
      );
      return true;
    }
    const targetId =
      Number(
        state.data?.userId
      );
    if (!targetId) {
      await deleteAdminState(
        env,
        userId
      );
      await telegram(
        env,
        "sendMessage",
        {
          chat_id:
            chatId,
          text:
            "❌ اطلاعات کاربر پیدا نشد. دوباره تلاش کنید."
        }
      );
      return true;
    }
    const members =
      await getStreamTimeMembers(
        env
      );
    if (
      !members.includes(
        targetId
      )
    ) {
      await deleteAdminState(
        env,
        userId
      );
      await telegram(
        env,
        "sendMessage",
        {
          chat_id:
            chatId,
          text:
            "⚠️ این کاربر دیگر در لیست StreamTime نیست."
        }
      );
      return true;
    }
    await saveUserReferral(
      env,
      targetId,
      text
    );
    await deleteAdminState(
      env,
      userId
    );
    const profile =
      await getTelegramProfile(
        env,
        targetId
      );
    await telegram(
      env,
      "sendMessage",
      {
        chat_id:
          chatId,
        text:
          "✅ Referral با موفقیت ثبت شد.\n\n" +
          `${formatTelegramProfile(profile, targetId)}\n` +
          `🎫 Referral: ${text}`
      }
    );
    return true;
  }
  return false;
}
async function saveTeamGameName(env, userId, gameName) {
  if (!env.BOT_STATE) return;
  const clean = String(gameName || "").trim().slice(0, 64);
  if (!clean) return;
  await env.BOT_STATE.put(`team:game_name:${Number(userId)}`, clean);
}
async function getTeamGameName(env, userId) {
  if (!env.BOT_STATE) return "";
  return String(await env.BOT_STATE.get(`team:game_name:${Number(userId)}`) || "").trim();
}

async function saveUserReferral(
  env,
  userId,
  referral
) {
  if (!env.BOT_STATE) {
    return;
  }
  await env.BOT_STATE.put(
    `referral:${userId}`,
    String(
      referral || ""
    )
  );
}
async function getUserReferral(
  env,
  userId
) {
  if (!env.BOT_STATE) {
    return "";
  }
  return await env.BOT_STATE.get(
    `referral:${userId}`
  ) || "";
}
async function deleteUserReferral(
  env,
  userId
) {
  if (!env.BOT_STATE) {
    return;
  }
  await env.BOT_STATE.delete(
    `referral:${userId}`
  );
}
async function startStreamTime(
  env,
  chatId,
  userId
) {
  const state = {
    step:
      1,
    data:
      {}
  };
  await saveStreamTimeState(
    env,
    userId,
    state
  );
  await telegram(
    env,
    "sendMessage",
    {
      chat_id:
        chatId,
      text:
        "⏰ ثبت StreamTime\n\n" +
        "نام و نام خانوادگی خود را وارد کنید:"
    }
  );
}
async function getStreamTimeState(
  env,
  userId
) {
  if (!env.BOT_STATE) {
    return null;
  }
  return await env.BOT_STATE.get(
    `streamtime:${userId}`,
    "json"
  );
}
async function saveStreamTimeState(
  env,
  userId,
  state
) {
  if (!env.BOT_STATE) {
    return;
  }
  await env.BOT_STATE.put(
    `streamtime:${userId}`,
    JSON.stringify(
      state
    ),
    {
      expirationTtl:
        1800
    }
  );
}
async function deleteStreamTimeState(
  env,
  userId
) {
  if (!env.BOT_STATE) {
    return;
  }
  await env.BOT_STATE.delete(
    `streamtime:${userId}`
  );
}
async function handleStreamTimeStep(
  env,
  message,
  state
) {
  const userId =
    message.from.id;
  const chatId =
    message.chat.id;
  const text =
    message.text
      ? message.text.trim()
      : "";
  if (!text) {
    await telegram(
      env,
      "sendMessage",
      {
        chat_id:
          chatId,
        text:
          "❌ لطفاً پاسخ را به صورت متن ارسال کنید."
      }
    );
    return;
  }
  if (
    state.step ===
    1
  ) {
    state.data.name =
      text;
    state.step =
      2;
    await saveStreamTimeState(
      env,
      userId,
      state
    );
    await telegram(
      env,
      "sendMessage",
      {
        chat_id:
          chatId,
        text:
          "✅ نام ثبت شد.\n\n" +
          "👤 Referral را وارد کنید:"
      }
    );
    return;
  }
  if (
    state.step ===
    2
  ) {
    state.data.referral =
      text;
    state.step =
      3;
    await saveStreamTimeState(
      env,
      userId,
      state
    );
    await telegram(
      env,
      "sendMessage",
      {
        chat_id:
          chatId,
        text:
          "📅 تاریخ استریم را وارد کنید:\n\n" +
          "مثال: 1405/07/01"
      }
    );
    return;
  }
  if (
    state.step ===
    3
  ) {
    state.data.date =
      text;
    state.step =
      4;
    await saveStreamTimeState(
      env,
      userId,
      state
    );
    await telegram(
      env,
      "sendMessage",
      {
        chat_id:
          chatId,
        text:
          "🕐 ساعت شروع استریم را وارد کنید:\n\n" +
          "مثال: 18:30"
      }
    );
    return;
  }
  if (
    state.step ===
    4
  ) {
    state.data.timeStart =
      text;
    state.step =
      5;
    await saveStreamTimeState(
      env,
      userId,
      state
    );
    await telegram(
      env,
      "sendMessage",
      {
        chat_id:
          chatId,
        text:
          "🕐 ساعت پایان استریم را وارد کنید:\n\n" +
          "مثال: 21:00"
      }
    );
    return;
  }
  if (
    state.step ===
    5
  ) {
    state.data.timeEnd =
      text;
    state.step =
      6;
    await saveStreamTimeState(
      env,
      userId,
      state
    );
    await telegram(
      env,
      "sendMessage",
      {
        chat_id:
          chatId,
        text:
          "🔗 لینک استریم را ارسال کنید:"
      }
    );
    return;
  }
  if (
    state.step ===
    6
  ) {
    state.data.linkStream =
      text;
    state.step =
      7;
    await saveStreamTimeState(
      env,
      userId,
      state
    );
    await telegram(
      env,
      "sendMessage",
      {
        chat_id:
          chatId,
        text:
          "⏱️ مدت زمان استریم را وارد کنید:\n\n" +
          "مثال:\n" +
          "2 = دو ساعت\n" +
          "2:13 = دو ساعت و 13 دقیقه\n" +
          "0:45 = 45 دقیقه"
      }
    );
    return;
  }
  if (
    state.step ===
    7
  ) {
    const duration =
      parseDuration(
        text
      );
    if (
      duration ===
      null
    ) {
      await telegram(
        env,
        "sendMessage",
        {
          chat_id:
            chatId,
          text:
            "❌ فرمت زمان اشتباه است.\n\n" +
            "مثال صحیح:\n" +
            "2\n" +
            "2:13\n" +
            "0:45"
        }
      );
      return;
    }
    state.data.duration =
      duration;
    await addStreamTime(
      env,
      userId,
      duration
    );
    await saveStreamReminder(env, userId, state.data);
    const result = `
Name: ${state.data.name}
Referral: ${state.data.referral}
Date: ${state.data.date}
Time Start: ${state.data.timeStart}
Time End: ${state.data.timeEnd}
Duration: ${formatDuration(duration)}
Link Stream : ${state.data.linkStream}
#StreamTime
`;
    const ownerResult =
      await telegram(
        env,
        "sendMessage",
        {
          chat_id:
            OWNER_ID,
          text:
            "📥 StreamTime جدید\n\n" +
            `🆔 User ID: ${userId}\n\n` +
            result
        }
      );
    const streamTimeGroups =
      await getStreamTimeGroups(
        env
      );
    if (
      streamTimeGroups.length > 0 &&
      ownerResult &&
      ownerResult.ok &&
      ownerResult.result &&
      ownerResult.result.message_id
    ) {
      for (
        const group of streamTimeGroups
      ) {
        try {
          const copyResult =
            await telegram(
              env,
              "copyMessage",
              {
                chat_id:
                  group.chatId,
                from_chat_id:
                  OWNER_ID,
                message_id:
                  ownerResult.result.message_id
              }
            );
          if (
            !copyResult ||
            !copyResult.ok
          ) {
            console.log(
              "STREAMTIME GROUP COPY FAILED:",
              group.chatId,
              copyResult
            );
          }
        } catch (error) {
          console.log(
            "STREAMTIME GROUP COPY ERROR:",
            group.chatId,
            error
          );
        }
      }
    }
    await telegram(
      env,
      "sendMessage",
      {
        chat_id:
          chatId,
        text:
          "✅ StreamTime شما ثبت شد.\n\n" +
          result
      }
    );
    await deleteStreamTimeState(
      env,
      userId
    );
    return;
  }
}
function parseDuration(
  text
) {
  text =
    text.trim();
  if (
    /^\d+$/.test(text)
  ) {
    const hours =
      Number(text);
    if (
      hours <
      0
    ) {
      return null;
    }
    return (
      hours *
      60
    );
  }
  const match =
    text.match(
      /^(\d+):([0-5]\d)$/
    );
  if (!match) {
    return null;
  }
  const hours =
    Number(
      match[1]
    );
  const minutes =
    Number(
      match[2]
    );
  return (
    hours *
    60 +
    minutes
  );
}
function formatDuration(
  totalMinutes
) {
  totalMinutes =
    Number(
      totalMinutes
    ) || 0;
  const hours =
    Math.floor(
      totalMinutes /
      60
    );
  const minutes =
    totalMinutes %
    60;
  return (
    `${hours}:${String(minutes).padStart(2, "0")}`
  );
}
async function addStreamTime(
  env,
  userId,
  minutes
) {
  if (!env.BOT_STATE) {
    return;
  }
  const key =
    `totalstream:${userId}`;
  const old =
    await env.BOT_STATE.get(
      key,
      "json"
    );
  const oldMinutes =
    old?.minutes ||
    0;
  // Initialize lifetime totals before the current timer is changed, so the first new stream is not double-counted.
  await ensureLifetimeStreamStats(env, userId);
  const newMinutes =
    oldMinutes +
    minutes;
  await env.BOT_STATE.put(
    key,
    JSON.stringify({
      minutes:
        newMinutes
    })
  );
  await recordTeamStream(env, userId, minutes);
}
async function setStreamTime(
  env,
  userId,
  minutes
) {
  if (!env.BOT_STATE) {
    return;
  }
  const safeMinutes =
    Math.max(
      0,
      Number(minutes) || 0
    );
  await env.BOT_STATE.put(
    `totalstream:${userId}`,
    JSON.stringify({
      minutes:
        safeMinutes
    })
  );
}
async function getTotalStreamTime(
  env,
  userId
) {
  if (!env.BOT_STATE) {
    return 0;
  }
  const key =
    `totalstream:${userId}`;
  const data =
    await env.BOT_STATE.get(
      key,
      "json"
    );
  if (!data) {
    return 0;
  }
  return (
    data.minutes ||
    0
  );
}
async function broadcastMessageToAll(
  env,
  text
) {
  const users =
    await getBroadcastUsers(
      env
    );
  let success =
    0;
  let failed =
    0;
  const batchSize =
    10;
  for (
    let i = 0;
    i < users.length;
    i += batchSize
  ) {
    const batch =
      users.slice(
        i,
        i + batchSize
      );
    const results =
      await Promise.all(
        batch.map(
          async userId => {
            try {
              const result =
                await telegram(
                  env,
                  "sendMessage",
                  {
                    chat_id:
                      userId,
                    text:
                      text
                  }
                );
              if (
                result &&
                result.ok
              ) {
                return true;
              }
            } catch (error) {
              console.log(
                "BROADCAST USER ERROR:",
                userId,
                error
              );
            }
            return false;
          }
        )
      );
    for (
      const result of results
    ) {
      if (result) {
        success++;
      }
      else {
        failed++;
      }
    }
    if (
      i +
        batchSize <
      users.length
    ) {
      await new Promise(
        resolve =>
          setTimeout(
            resolve,
            450
          )
      );
    }
  }
  return {
    total:
      users.length,
    success:
      success,
    failed:
      failed
  };
}
async function sendSupportMessage(
  env,
  message
) {
  const forumChatId = await getSupportForumChatId(env);
  if (forumChatId) {
    const ok = await sendSupportMessageToForum(env, message, forumChatId);
    // وقتی Topics فعال است، پیام Support فقط باید داخل Supergroup برود.
    // حتی اگر ارسال شکست بخورد، به سیستم قدیمی/چت خصوصی Owner برنگرد.
    if (!ok) {
      console.log("SUPPORT FORUM DELIVERY FAILED:", message.from?.id);
    }
    return;
  }

  const user =
    message.from;


  const name =
    [
      user.first_name || "",
      user.last_name || ""
    ]
      .join(" ")
      .trim();


  const username =
    user.username
      ? `@${user.username}`
      : "ندارد";


  const info =
    "📩 پیام جدید Support\n\n" +
    `👤 Name: ${name || "ندارد"}\n` +
    `🔹 Username: ${username}\n` +
    `🆔 User ID: ${user.id}`;


  const supportAdmins =
    await getSupportAdmins(
      env
    );


  const recipients = [

    Number(OWNER_ID),

    ...supportAdmins

  ];


  const uniqueRecipients = [

    ...new Set(
      recipients.map(Number)
    )

  ];


  for (
    const targetChatId of uniqueRecipients
  ) {

    try {

      /* TEXT */

      if (
        message.text
      ) {

        await telegram(
          env,
          "sendMessage",
          {
            chat_id:
              targetChatId,

            text:
              info +
              "\n\n💬 Message:\n" +
              message.text
          }
        );


        continue;
      }


      /* PHOTO */

      if (
        message.photo
      ) {

        const photo =
          message.photo[
            message.photo.length - 1
          ];


        await telegram(
          env,
          "sendPhoto",
          {
            chat_id:
              targetChatId,

            photo:
              photo.file_id,

            caption:
              info +
              "\n\n📷 Photo"
          }
        );


        continue;
      }


      /* VIDEO */

      if (
        message.video
      ) {

        await telegram(
          env,
          "sendVideo",
          {
            chat_id:
              targetChatId,

            video:
              message.video.file_id,

            caption:
              info +
              "\n\n🎥 Video"
          }
        );


        continue;
      }


      /* DOCUMENT */

      if (
        message.document
      ) {

        await telegram(
          env,
          "sendDocument",
          {
            chat_id:
              targetChatId,

            document:
              message.document.file_id,

            caption:
              info +
              "\n\n📎 Document"
          }
        );


        continue;
      }


      /* VOICE */

      if (
        message.voice
      ) {

        await telegram(
          env,
          "sendVoice",
          {
            chat_id:
              targetChatId,

            voice:
              message.voice.file_id,

            caption:
              info +
              "\n\n🎤 Voice"
          }
        );


        continue;
      }


      /* OTHER */

      await telegram(
        env,
        "copyMessage",
        {
          chat_id:
            targetChatId,

          from_chat_id:
            message.chat.id,

          message_id:
            message.message_id
        }
      );


      await telegram(
        env,
        "sendMessage",
        {
          chat_id:
            targetChatId,

          text:
            info
        }
      );

    } catch (error) {

      console.log(
        "SUPPORT SEND ERROR:",
        targetChatId,
        error
      );
    }
  }
}


async function getSupportForumChatId(env) {
  if (!env.BOT_STATE) return null;
  const value = await env.BOT_STATE.get("support:forum:chat_id");
  if (!value || !/^-?\d+$/.test(value)) return null;
  return Number(value);
}
async function saveSupportForumChatId(env, chatId) {
  if (!env.BOT_STATE) return;
  await env.BOT_STATE.put("support:forum:chat_id", String(Number(chatId)));
}
async function sendSupportForumManagementMenu(env, chatId) {
  return sendTeamDashboard(env, chatId);
}

async function sendSupportMessageToForum(env, message, forumChatId) {
  const user = message.from;
  const userId = Number(user.id);

  async function createTopic() {
    const name = [user.first_name || "", user.last_name || ""].join(" ").trim();
    const title = (`Support | ${name || "User"} | ${userId}`).slice(0, 128);
    const created = await telegram(env, "createForumTopic", {
      chat_id: Number(forumChatId),
      name: title
    });

    if (!(created && created.ok && created.result)) {
      console.log("SUPPORT TOPIC CREATE ERROR:", created);
      return null;
    }

    const topic = {
      chatId: Number(forumChatId),
      threadId: Number(created.result.message_thread_id)
    };

    await env.BOT_STATE.put(`support:topic:${userId}`, JSON.stringify(topic));
    await env.BOT_STATE.put(
      `support:thread:${forumChatId}:${topic.threadId}`,
      String(userId)
    );

    const username = user.username ? `@${user.username}` : "ندارد";
    await telegram(env, "sendMessage", {
      chat_id: Number(forumChatId),
      message_thread_id: topic.threadId,
      text:
        "📩 <b>Support جدید</b>\n\n" +
        `👤 Name: ${escapeHtml([user.first_name || "", user.last_name || ""].join(" ").trim() || "ندارد")}\n` +
        `🔹 Username: ${escapeHtml(username)}\n` +
        `🆔 User ID: <code>${userId}</code>\n\n` +
        "پیام‌های این کاربر از این به بعد داخل همین Topic قرار می‌گیرند.",
      parse_mode: "HTML"
    });

    return topic;
  }

  let topic = await env.BOT_STATE.get(`support:topic:${userId}`, "json");

  if (
    !topic ||
    Number(topic.chatId) !== Number(forumChatId) ||
    !topic.threadId
  ) {
    topic = await createTopic();
    if (!topic) return false;
  }

  let copied = await telegram(env, "copyMessage", {
    chat_id: Number(forumChatId),
    from_chat_id: message.chat.id,
    message_id: message.message_id,
    message_thread_id: Number(topic.threadId)
  });

  // اگر Topic توسط ادمین حذف شده باشد، Topic قبلی نامعتبر است.
  // آن را پاک می‌کنیم و برای همان کاربر یک Topic جدید می‌سازیم.
  if (!(copied && copied.ok)) {
    console.log("SUPPORT TOPIC COPY ERROR - RECREATING TOPIC:", copied);

    await env.BOT_STATE.delete(`support:topic:${userId}`);
    await env.BOT_STATE.delete(
      `support:thread:${forumChatId}:${Number(topic.threadId)}`
    );

    topic = await createTopic();
    if (!topic) return false;

    copied = await telegram(env, "copyMessage", {
      chat_id: Number(forumChatId),
      from_chat_id: message.chat.id,
      message_id: message.message_id,
      message_thread_id: Number(topic.threadId)
    });

    if (!(copied && copied.ok)) {
      console.log("SUPPORT NEW TOPIC COPY ERROR:", copied);
      return false;
    }
  }

  return true;
}
async function handleSupportForumMessage(env, message) {
  if (!message.message_thread_id) return;
  if (!message.from || message.from.is_bot) return;
  const forumChatId = await getSupportForumChatId(env);
  const threadId = Number(message.message_thread_id);
  const targetUserId = Number(
    await env.BOT_STATE.get(`support:thread:${forumChatId}:${threadId}`)
  );
  if (!targetUserId) return;
  const supportAdmin = await isSupportAdmin(env, message.from.id);
  const isOwner = Number(message.from.id) === Number(OWNER_ID);
  if (!isOwner && !supportAdmin) return;
  if (message.text && message.text.startsWith("/")) {
    if (message.text === "/close") {
      await telegram(env, "sendMessage", {
        chat_id: Number(forumChatId),
        message_thread_id: threadId,
        text: "🔒 Topic بسته شد. برای پیام جدید کاربر دوباره Topic فعال می‌شود."
      });
      await env.BOT_STATE.delete(`support:topic:${targetUserId}`);
      return;
    }
  }
  if (message.text) {
    await telegram(env, "sendMessage", {
      chat_id: targetUserId,
      text: "📩 پاسخ Support:\n\n" + message.text
    });
  } else if (message.photo || message.video || message.document || message.voice || message.audio || message.sticker) {
    await telegram(env, "copyMessage", {
      chat_id: targetUserId,
      from_chat_id: message.chat.id,
      message_id: message.message_id
    });
  } else {
    return;
  }
  if (supportAdmin) {
    const adminProfile = await getTelegramProfile(env, message.from.id);
    const adminName = getPublicUserName(adminProfile, message.from.id);
    await telegram(env, "sendMessage", {
      chat_id: OWNER_ID,
      text:
        "👮 <b>پاسخ ادمین Support</b>\n\n" +
        `👤 ادمین: ${escapeHtml(adminName)}\n` +
        `🆔 Admin ID: ${message.from.id}\n` +
        `👤 کاربر: ${targetUserId}`,
      parse_mode: "HTML"
    });
  }
}
async function getProfileAllowedUsers(env) {
  if (!env.BOT_STATE) return [Number(OWNER_ID)];
  return await env.BOT_STATE.get("profile:allowed", "json") || [Number(OWNER_ID)];
}
async function saveProfileAllowedUsers(env, users) {
  if (!env.BOT_STATE) return;
  const unique = [...new Set(users.map(Number))];
  if (!unique.includes(Number(OWNER_ID))) unique.unshift(Number(OWNER_ID));
  await env.BOT_STATE.put("profile:allowed", JSON.stringify(unique));
}
async function isAllowedProfile(env, userId) {
  if (Number(userId) === Number(OWNER_ID)) return true;
  return (await getProfileAllowedUsers(env)).includes(Number(userId));
}

async function sendUnifiedUserAccessList(env, chatId) {
  if (!env.BOT_STATE) return;
  const [streamMembers, announceUsers, supportAdmins, profileUsers] = await Promise.all([
    getStreamTimeMembers(env),
    getStreamAnnouncementAllowedUsers(env),
    getSupportAdmins(env),
    getProfileAllowedUsers(env)
  ]);
  const ids = [...new Set([
    ...supportAdmins.map(Number),
    ...streamMembers.map(Number),
    ...announceUsers.map(Number),
    ...profileUsers.map(Number)
  ])].filter(id => id > 0 && id !== Number(OWNER_ID));
  if (!ids.length) {
    await telegram(env, "sendMessage", {
      chat_id: chatId,
      text: "📋 هنوز هیچ کاربری به یکی از دسترسی‌ها اضافه نشده است."
    });
    return;
  }
  const keyboard = [];
  for (const id of ids.slice(0, 100)) {
    const profile = await getTelegramProfile(env, id);
    const perms = await getUnifiedUserPermissions(env, id);
    const icons = `${perms.support ? "🛡️" : "▫️"}${perms.streamtime ? " ⏰" : " ▫️"}${perms.profile ? " 👤" : " ▫️"}${perms.announce ? " 📣" : " ▫️"}`;
    keyboard.push([{ text: `${icons} ${getPublicUserName(profile, id)}`, callback_data: `user_access_select:${id}` }]);
  }
  keyboard.push([{ text: "🔙 مدیریت StreamTime", callback_data: "streamtime_manage" }]);
  await telegram(env, "sendMessage", {
    chat_id: chatId,
    text:
      "🔐 <b>مدیریت یکپارچه دسترسی کاربران</b>\n\n" +
      "فقط افرادی که حداقل یک دسترسی به آن‌ها داده شده نمایش داده می‌شوند.\n\n" +
      "🛡️ Support   ⏰ StreamTime   👤 پروفایل   📣 اعلام استریم\n\n" +
      "روی هر شخص بزن تا دسترسی‌هایش را مستقیم فعال یا غیرفعال کنی.",
    parse_mode: "HTML",
    reply_markup: { inline_keyboard: keyboard }
  });
}
async function getUnifiedUserPermissions(env, userId) {
  const id = Number(userId);
  const support = id === Number(OWNER_ID) || await isSupportAdmin(env, id);
  const streamtime = id === Number(OWNER_ID) || support || (await getStreamTimeMembers(env)).includes(id);
  const announce = id === Number(OWNER_ID) || support || (await getStreamAnnouncementAllowedUsers(env)).includes(id);
  const profile = id === Number(OWNER_ID) || (await isAllowedProfile(env, id));
  return { support, streamtime, announce, profile };
}
async function sendUnifiedUserAccessPanel(env, chatId, targetId) {
  const profile = await getTelegramProfile(env, targetId);
  const perms = await getUnifiedUserPermissions(env, targetId);
  const isOwner = Number(targetId) === Number(OWNER_ID);
  const supportAdmin = await isSupportAdmin(env, targetId);
  let text =
    "🔐 <b>دسترسی کاربر</b>\n\n" +
    `${formatTelegramProfile(profile, targetId)}\n\n` +
    `🛡️ Support: ${perms.support ? "✅ فعال" : "❌ غیرفعال"}\n` +
    `⏰ StreamTime: ${perms.streamtime ? (supportAdmin ? "✅ فعال (به‌دلیل Support)" : "✅ فعال") : "❌ غیرفعال"}\n` +
    `👤 پروفایل: ${perms.profile ? "✅ فعال" : "❌ غیرفعال"}\n` +
    `📣 اعلام استریم: ${perms.announce ? (supportAdmin ? "✅ فعال (به‌دلیل Support)" : "✅ فعال") : "❌ غیرفعال"}`;
  if (isOwner) text += "\n\n👑 Owner است و دسترسی‌هایش قابل تغییر نیست.";
  const rows = [];
  if (!isOwner) {
    rows.push([{ text: `${perms.support ? "❌ گرفتن" : "✅ دادن"} Support`, callback_data: `user_access_toggle:support:${targetId}` }]);
    if (!supportAdmin) {
      rows.push([{ text: `${perms.streamtime ? "❌ گرفتن" : "✅ دادن"} StreamTime`, callback_data: `user_access_toggle:streamtime:${targetId}` }]);
      rows.push([{ text: `${perms.announce ? "❌ گرفتن" : "✅ دادن"} اعلام استریم`, callback_data: `user_access_toggle:announce:${targetId}` }]);
    }
    rows.push([{ text: `${perms.profile ? "❌ گرفتن" : "✅ دادن"} پروفایل`, callback_data: `user_access_toggle:profile:${targetId}` }]);
  }
  rows.push([{ text: "🔙 لیست کاربران", callback_data: "user_access_manage" }]);
  await telegram(env, "sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    reply_markup: { inline_keyboard: rows }
  });
}
async function toggleUnifiedUserAccess(env, chatId, targetId, permission, returnToMember = false) {
  if (Number(targetId) === Number(OWNER_ID)) {
    await telegram(env, "sendMessage", { chat_id: chatId, text: "❌ دسترسی Owner قابل تغییر نیست." });
    return;
  }
  const isSupport = await isSupportAdmin(env, targetId);
  if (permission === "support") {
    if (isSupport) await removeSupportAdmin(env, targetId);
    else await addSupportAdmin(env, targetId);
  } else if (permission === "streamtime") {
    if (isSupport) return;
    const members = await getStreamTimeMembers(env);
    if (members.includes(Number(targetId))) {
      await saveStreamTimeMembers(env, members.filter(id => Number(id) !== Number(targetId)));
    } else {
      await saveStreamTimeMembers(env, [...members, Number(targetId)]);
    }
  } else if (permission === "profile") {
    const allowed = await getProfileAllowedUsers(env);
    if (allowed.includes(Number(targetId))) await saveProfileAllowedUsers(env, allowed.filter(id => Number(id) !== Number(targetId)));
    else await saveProfileAllowedUsers(env, [...allowed, Number(targetId)]);
  } else if (permission === "announce") {
    if (isSupport) return;
    const allowed = await getStreamAnnouncementAllowedUsers(env);
    if (allowed.includes(Number(targetId))) await deleteStreamAnnouncementAccess(env, targetId);
    else await saveStreamAnnouncementAccess(env, targetId);
  }
  if (returnToMember) await sendTeamMemberCard(env, chatId, targetId);
  else await sendUnifiedUserAccessPanel(env, chatId, targetId);
}

async function addTeamAdminLog(env, action, targetId = 0, details = {}) {
  if (!env.BOT_STATE) return;
  const key = "team:admin_logs";
  const logs = await env.BOT_STATE.get(key, "json") || [];
  logs.push({
    action: String(action || ""),
    targetId: Number(targetId || 0),
    details: details || {},
    at: Date.now()
  });
  const trimmed = logs.slice(-100);
  await env.BOT_STATE.put(key, JSON.stringify(trimmed));
}

async function getTeamAdminLogs(env) {
  if (!env.BOT_STATE) return [];
  return await env.BOT_STATE.get("team:admin_logs", "json") || [];
}

function teamKey(type, userId) {
  return `team:${type}:${Number(userId)}`;
}
async function getTeamStats(env, userId) {
  if (!env.BOT_STATE) return { streams: 0, minutes: 0, points: 0, status: "Active", trialUntil: 0, lastStreamAt: 0 };
  return await env.BOT_STATE.get(teamKey("stats", userId), "json") || {
    streams: 0, minutes: 0, points: 0, status: "Active", trialUntil: 0, lastStreamAt: 0
  };
}

function getIranDateKey(timestamp = Date.now()) {
  return new Date(Number(timestamp) + 210 * 60 * 1000).toISOString().slice(0, 10);
}

async function ensureLifetimeStreamStats(env, userId) {
  if (!env.BOT_STATE) return { streams: 0, minutes: 0 };
  const id = Number(userId);
  const initializedKey = `team:lifetime_streams_initialized:${id}`;
  const initialized = await env.BOT_STATE.get(initializedKey);
  if (initialized) {
    return await env.BOT_STATE.get(`team:lifetime_streams:${id}`, "json") || { streams: 0, minutes: 0 };
  }
  // One-time best-effort migration: preserve currently available counters. Previous resets cannot be reconstructed.
  const stats = await getTeamStats(env, id);
  const currentMinutes = await getTotalStreamTime(env, id);
  const lifetime = {
    streams: Math.max(0, Number(stats.streams || 0)),
    minutes: Math.max(0, Number(currentMinutes || 0))
  };
  await env.BOT_STATE.put(`team:lifetime_streams:${id}`, JSON.stringify(lifetime));
  await env.BOT_STATE.put(initializedKey, "1");
  return lifetime;
}

async function getLifetimeStreamStats(env, userId) {
  return await ensureLifetimeStreamStats(env, userId);
}
async function saveTeamStats(env, userId, stats) {
  if (!env.BOT_STATE) return;
  await env.BOT_STATE.put(teamKey("stats", userId), JSON.stringify(stats));
}
async function recordTeamStream(env, userId, minutes) {
  const id = Number(userId);
  const duration = Math.max(0, Number(minutes || 0));
  const stats = await getTeamStats(env, id);
  stats.streams = Number(stats.streams || 0) + 1;
  stats.lastStreamAt = Date.now();
  await saveTeamStats(env, id, stats);

  const lifetime = await env.BOT_STATE.get(`team:lifetime_streams:${id}`, "json") || { streams: 0, minutes: 0 };
  lifetime.streams = Number(lifetime.streams || 0) + 1;
  lifetime.minutes = Number(lifetime.minutes || 0) + duration;
  await env.BOT_STATE.put(`team:lifetime_streams:${id}`, JSON.stringify(lifetime));

  const dateKey = getIranDateKey();
  const dailyKey = `team:daily_streams:${dateKey}:${id}`;
  const daily = await env.BOT_STATE.get(dailyKey, "json") || { userId: id, date: dateKey, streams: 0, minutes: 0 };
  daily.streams = Number(daily.streams || 0) + 1;
  daily.minutes = Number(daily.minutes || 0) + duration;
  daily.lastStreamAt = Date.now();
  await env.BOT_STATE.put(dailyKey, JSON.stringify(daily));
  await addTeamAdminLog(env, "stream", id, { minutes: duration, date: dateKey });
}
async function getTeamUsers(env) {
  const ids = await getStreamTimeMembers(env);
  return [...new Set(ids.map(Number))].filter(id => id > 0 && Number(id) !== Number(OWNER_ID));
}
function teamRank(points) {
  points = Number(points || 0);
  if (points >= 6000) return "👑 Legend";
  if (points >= 4000) return "💎 Master";
  if (points >= 2500) return "🔥 Diamond";
  if (points >= 1500) return "🏆 Platinum";
  if (points >= 800) return "🥇 Gold";
  if (points >= 300) return "🥈 Silver";
  if (points >= 100) return "🥉 Bronze";
  return "🟡 Trial";
}

function teamRankList() {
  return [
    ["🟡 Trial", 0],
    ["🥉 Bronze", 100],
    ["🥈 Silver", 300],
    ["🥇 Gold", 800],
    ["🏆 Platinum", 1500],
    ["🔥 Diamond", 2500],
    ["💎 Master", 4000],
    ["👑 Legend", 6000]
  ];
}

const STREAM_REVIEW_ITEMS = [
  "🎮 کیفیت گیم‌پلی",
  "🎙️ کیفیت صدا و تصویر",
  "💬 تعامل با مخاطب",
  "🔥 جذابیت استریم",
  "⏱ منظم بودن"
];

async function getStreamReviewGroupId(env) {
  if (!env.BOT_STATE) return "";
  return String(await env.BOT_STATE.get("streamreview:group_id") || "");
}

function streamReviewKeyboard(sessionId) {
  const rows = [];
  const criterionIcons = ["🎮", "🎙️", "💬", "🔥", "⏱️"];
  for (let i = 0; i < STREAM_REVIEW_ITEMS.length; i++) {
    rows.push([1, 2, 3, 4, 5].map(score => ({
      text: `${criterionIcons[i]} ${score}`,
      callback_data: `sr_score:${sessionId}:${i}:${score}`
    })));
  }
  rows.push([{ text: "ثبت ارزیابی من", callback_data: `sr_submit:${sessionId}` }]);
  return { inline_keyboard: rows };
}

function renderStreamReviewText(session) {
  const evaluations = Object.values(session.evaluations || {});
  const lines = [
    "<b>لایو جدید · ارزیابی استریم</b>",
    "",
    `نام استریمر: <b>${escapeHtml(session.targetName || "استریمر")}</b>`,
    `آیدی استریمر: <code>${Number(session.targetId)}</code>`,
    `عنوان: ${escapeHtml(session.title || "استریم جدید")}`,
    `لینک: ${escapeHtml(session.link || "لینک ثبت نشده")}`,
    "",
    "برای هر معیار، یک عدد از ۱ تا ۵ انتخاب کن؛ سپس «ثبت ارزیابی من» را بزن.",
    "🎮 کیفیت گیم‌پلی",
    "🎙️ کیفیت صدا و تصویر",
    "💬 تعامل با مخاطب",
    "🔥 جذابیت استریم",
    "⏱️ منظم بودن",
    ""
  ];
  if (!evaluations.length) {
    lines.push("هنوز ارزیابی‌ای ثبت نشده است.");
  } else {
    lines.push(`تعداد ارزیابی‌های ثبت‌شده: <b>${evaluations.length}</b>`);
    const means = STREAM_REVIEW_ITEMS.map((_, index) => {
      const values = evaluations.map(item => Number(item.scores?.[index])).filter(Number.isFinite);
      return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
    });
    means.forEach((mean, index) => lines.push(`${STREAM_REVIEW_ITEMS[index]}: <b>${mean ? mean.toFixed(2) + "/5" : "—"}</b>`));
    const allScores = evaluations.flatMap(item => (item.scores || []).map(Number)).filter(Number.isFinite);
    const overall = allScores.length ? allScores.reduce((a, b) => a + b, 0) / allScores.length : 0;
    lines.push(`\n<b>میانگین کل: ${overall.toFixed(2)}/5</b>`);
  }
  lines.push("\nهر عضو گروه می‌تواند ارزیابی ثبت کند؛ لازم نیست از قبل در فهرست اعضای بات اضافه شده باشد.");
  return lines.join("\n");
}

async function sendStreamReviewPost(env, details) {
  const groupId = await getStreamReviewGroupId(env);
  if (!groupId) return { ok: false, error: "⚠️ گروه ارزیابی هنوز تنظیم نشده است. بات را به گروه ارزیابی اضافه کن و دستور /setstreamreviewgroup را با اکانت مدیر اصلی داخل همان گروه بفرست." };
  const sessionId = crypto.randomUUID().replace(/-/g, "").slice(0, 12);
  const session = {
    id: sessionId,
    groupId,
    targetId: Number(details.targetId),
    targetName: String(details.targetName || "استریمر"),
    title: String(details.title || "استریم جدید"),
    link: String(details.link || ""),
    hasPhoto: details.type === "photo" && Boolean(details.photo),
    createdAt: Date.now(),
    messageId: 0,
    pointsAwarded: 0,
    evaluations: {}
  };
  await env.BOT_STATE.put(`streamreview:session:${sessionId}`, JSON.stringify(session));
  const text = renderStreamReviewText(session);
  let result;
  if (session.hasPhoto) {
    result = await telegram(env, "sendPhoto", {
      chat_id: groupId,
      photo: details.photo,
      caption: text,
      parse_mode: "HTML",
      reply_markup: streamReviewKeyboard(sessionId)
    });
  } else {
    result = await telegram(env, "sendMessage", {
      chat_id: groupId,
      text,
      parse_mode: "HTML",
      disable_web_page_preview: false,
      reply_markup: streamReviewKeyboard(sessionId)
    });
  }
  if (!result?.ok || !result.result?.message_id) {
    await env.BOT_STATE.delete(`streamreview:session:${sessionId}`);
    return { ok: false, error: `⚠️ نتوانستم پیام ارزیابی را در گروه بفرستم. مطمئن شو بات داخل گروه است و اجازه ارسال پیام دارد. ${result?.description ? `(${result.description})` : ""}` };
  }
  session.messageId = Number(result.result.message_id);
  await env.BOT_STATE.put(`streamreview:session:${sessionId}`, JSON.stringify(session));
  return { ok: true, sessionId };
}

async function updateStreamReviewMessage(env, session) {
  if (!session?.groupId || !session?.messageId) return;
  const payload = {
    chat_id: session.groupId,
    message_id: Number(session.messageId),
    caption: renderStreamReviewText(session),
    parse_mode: "HTML",
    reply_markup: streamReviewKeyboard(session.id)
  };
  if (session.hasPhoto) {
    await telegram(env, "editMessageCaption", payload);
  } else {
    const textPayload = { ...payload, text: payload.caption };
    delete textPayload.caption;
    await telegram(env, "editMessageText", textPayload);
  }
}

async function getStreamReviewSession(env, sessionId) {
  if (!env.BOT_STATE || !/^[a-f0-9]{8,16}$/i.test(String(sessionId || ""))) return null;
  return await env.BOT_STATE.get(`streamreview:session:${sessionId}`, "json");
}

async function isStreamReviewGroupMember(env, groupId, userId) {
  const configured = await getStreamReviewGroupId(env);
  if (!configured || String(configured) !== String(groupId)) return false;
  try {
    const member = await telegram(env, "getChatMember", { chat_id: groupId, user_id: Number(userId) });
    if (member?.ok && member.result) {
      const status = String(member.result.status || "");
      if (status === "left" || status === "kicked") return false;
      if (status === "restricted" && member.result.is_member === false) return false;
      return ["member", "administrator", "creator", "restricted"].includes(status);
    }
  } catch (error) {
    console.log("STREAM REVIEW MEMBERSHIP CHECK:", error);
  }
  // If Telegram cannot verify membership (for example, the bot is not an admin),
  // still allow a callback originating from the configured group's own message.
  return true;
}

async function sendStreamReviewResults(env, chatId, session) {
  const evaluations = Object.values(session.evaluations || {});
  let text = `📊 <b>نتیجه ارزیابی لایو</b>\n\n👤 ${escapeHtml(session.targetName)}\n🆔 <code>${Number(session.targetId)}</code>\n🎮 ${escapeHtml(session.title)}\n\n👥 تعداد ارزیابی‌ها: <b>${evaluations.length}</b>\n`;
  if (!evaluations.length) text += "\nهنوز کسی ارزیابی ثبت نکرده است.";
  else {
    const means = STREAM_REVIEW_ITEMS.map((_, index) => {
      const values = evaluations.map(item => Number(item.scores?.[index])).filter(Number.isFinite);
      return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
    });
    means.forEach((mean, index) => { text += `${STREAM_REVIEW_ITEMS[index]}: <b>${mean.toFixed(2)}/5</b>\n`; });
    const values = evaluations.flatMap(item => (item.scores || []).map(Number)).filter(Number.isFinite);
    const average = values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
    text += `\n🏆 میانگین کل: <b>${average.toFixed(2)}/5</b>`;
  }
  await telegram(env, "sendMessage", { chat_id: chatId, text, parse_mode: "HTML", reply_markup: { inline_keyboard: [[{ text: "🔄 بروزرسانی نتیجه", callback_data: `sr_results:${session.id}` }], [{ text: "📋 آمار ارزیاب‌ها", callback_data: "sr_reviewers:0" }]] } });
}

async function sendStreamReviewSessionList(env, chatId) {
  const sessions = [];
  if (env.BOT_STATE) {
    let cursor;
    do {
      const options = { prefix: "streamreview:session:", limit: 1000 };
      if (cursor) options.cursor = cursor;
      const page = await env.BOT_STATE.list(options);
      for (const key of page.keys || []) {
        const session = await env.BOT_STATE.get(key.name, "json");
        if (session) sessions.push(session);
      }
      cursor = page.list_complete ? undefined : page.cursor;
    } while (cursor);
  }
  sessions.sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0));
  const recent = sessions.slice(0, 20);
  const rows = recent.map(session => [{
    text: `${session.targetName || "استریمر"} · ${session.title || "استریم"}`.slice(0, 60),
    callback_data: `sr_results:${session.id}`
  }]);
  let text = "📊 <b>نتیجه ارزیابی لایوها</b>\n\nبرای دیدن نتیجه هر استریم، آن را انتخاب کن.";
  if (!recent.length) text = "📊 هنوز هیچ استریمی برای ارزیابی ثبت نشده است.";
  rows.push([{ text: "🔄 بروزرسانی", callback_data: "team_streamreview_results" }, { text: "🔙 داشبورد مدیریت", callback_data: "team_dashboard" }]);
  await telegram(env, "sendMessage", { chat_id: chatId, text, parse_mode: "HTML", reply_markup: { inline_keyboard: rows } });
}

async function getStreamReviewReviewerRecords(env) {
  const records = [];
  if (!env.BOT_STATE) return records;
  let cursor;
  do {
    const options = { prefix: "streamreview:reviewer:", limit: 1000 };
    if (cursor) options.cursor = cursor;
    const page = await env.BOT_STATE.list(options);
    for (const key of page.keys || []) {
      const record = await env.BOT_STATE.get(key.name, "json");
      if (record && Number(record.count || 0) > 0) records.push(record);
    }
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);
  records.sort((a, b) => Number(b.count || 0) - Number(a.count || 0) || Number(b.lastAt || 0) - Number(a.lastAt || 0));
  return records;
}

async function sendStreamReviewReviewerList(env, chatId, pageNumber = 0) {
  const records = await getStreamReviewReviewerRecords(env);
  const pageSize = 25;
  const maxPage = Math.max(0, Math.ceil(records.length / pageSize) - 1);
  const page = Math.max(0, Math.min(maxPage, Number(pageNumber) || 0));
  const slice = records.slice(page * pageSize, page * pageSize + pageSize);
  let text = `📋 <b>آمار ارزیاب‌های استریم</b>\n\n👥 تعداد ارزیاب‌ها: <b>${records.length}</b>\n🧾 مجموع ارزیابی‌های کلی: <b>${records.reduce((sum, r) => sum + Number(r.count || 0), 0)}</b>\n🔄 مجموع ارزیابی‌های دوره جاری: <b>${records.reduce((sum, r) => sum + Number(r.roundCount ?? r.count ?? 0), 0)}</b>\n\n`;
  if (!slice.length) text += "هنوز ارزیابی‌ای ثبت نشده است.";
  else text += slice.map((r, i) => `${page * pageSize + i + 1}. <b>${escapeHtml(r.name || "کاربر")}</b>\n   📚 آمار کلی: <b>${Number(r.count || 0)}</b> | 🔄 دوره جاری: <b>${Number(r.roundCount ?? r.count ?? 0)}</b>\n   🆔 <code>${Number(r.userId)}</code>${r.username ? ` · @${escapeHtml(r.username)}` : ""}`).join("\n");
  const rows = [];
  const nav = [];
  if (page > 0) nav.push({ text: "⬅️ قبلی", callback_data: `sr_reviewers:${page - 1}` });
  if (page < maxPage) nav.push({ text: "بعدی ➡️", callback_data: `sr_reviewers:${page + 1}` });
  if (nav.length) rows.push(nav);
  rows.push([{ text: "🔄 بروزرسانی", callback_data: `sr_reviewers:${page}` }]);
  rows.push([{ text: "🧹 ریست آمار دوره‌ای ارزیاب‌ها", callback_data: "sr_reviewers_reset_confirm" }]);
  await telegram(env, "sendMessage", { chat_id: chatId, text, parse_mode: "HTML", reply_markup: { inline_keyboard: rows } });
}

async function getStreamReviewTargetStats(env, targetId) {
  const out = { sessions: 0, evaluations: 0, criteria: STREAM_REVIEW_ITEMS.map(() => ({ sum: 0, count: 0 })), average: 0 };
  if (!env.BOT_STATE) {
    return {
      sessions: 0,
      evaluations: 0,
      criteria: STREAM_REVIEW_ITEMS.map(() => ({ average: 0, count: 0 })),
      average: 0
    };
  }
  let cursor;
  let overallSum = 0;
  let overallCount = 0;
  do {
    const options = { prefix: "streamreview:session:", limit: 1000 };
    if (cursor) options.cursor = cursor;
    const page = await env.BOT_STATE.list(options);
    for (const key of page.keys || []) {
      const session = await env.BOT_STATE.get(key.name, "json");
      if (!session || Number(session.targetId) !== Number(targetId)) continue;
      const evaluations = Object.values(session.evaluations || {});
      if (evaluations.length) out.sessions++;
      out.evaluations += evaluations.length;
      for (const evaluation of evaluations) {
        (evaluation.scores || []).forEach((score, index) => {
          const n = Number(score);
          if (Number.isFinite(n) && out.criteria[index]) { out.criteria[index].sum += n; out.criteria[index].count++; overallSum += n; overallCount++; }
        });
      }
    }
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);
  const finalizedCriteria = (out.criteria || []).map((item) => {
    const count = Number(item?.count || 0);
    const sum = Number(item?.sum || 0);
    return { average: count > 0 ? sum / count : 0, count };
  });
  return {
    sessions: Number(out.sessions || 0),
    evaluations: Number(out.evaluations || 0),
    criteria: finalizedCriteria,
    average: overallCount > 0 ? overallSum / overallCount : 0
  };
}

async function sendStreamReviewTargetStats(env, chatId, targetId) {
  const profile = await getTelegramProfile(env, targetId);
  const stats = await getStreamReviewTargetStats(env, targetId);
  let text = `📊 <b>ارزیابی‌های لایو · ${escapeHtml(getPublicUserName(profile, targetId))}</b>\n\n🆔 <code>${Number(targetId)}</code>\n🎥 استریم‌های دارای ارزیابی: <b>${stats.sessions}</b>\n🧾 مجموع ارزیابی‌ها: <b>${stats.evaluations}</b>\n\n`;
  if (!stats.evaluations) text += "هنوز ارزیابی‌ای برای این استریمر ثبت نشده است.";
  else {
    STREAM_REVIEW_ITEMS.forEach((item, index) => {
      const criterion = stats.criteria?.[index];
      const criterionAverage = Number(criterion?.average || 0);
      text += `${item}: <b>${criterionAverage.toFixed(2)}/5</b>
`;
    });
    text += `
🏆 میانگین کل: <b>${Number(stats.average || 0).toFixed(2)}/5</b>`;
  }
  await telegram(env, "sendMessage", { chat_id: chatId, text, parse_mode: "HTML", reply_markup: { inline_keyboard: [[{ text: "📋 آمار ارزیاب‌ها", callback_data: "sr_reviewers:0" }], [{ text: "🔙 پرونده عضو", callback_data: `team_member_card:${Number(targetId)}` }]] } });
}

async function handleStreamReviewCallback(env, callback) {
  const data = String(callback.data || "");
  const userId = Number(callback.from?.id);
  const chatId = callback.message?.chat?.id;
  const messageChatType = callback.message?.chat?.type;
  if (data === "sr_reviewers_reset_confirm") {
    if (userId !== Number(OWNER_ID)) {
      await telegram(env, "answerCallbackQuery", { callback_query_id: callback.id, text: "فقط مدیر اصلی می‌تواند آمار را ریست کند.", show_alert: true });
      return true;
    }
    await telegram(env, "sendMessage", { chat_id: chatId, text: "⚠️ فقط آمار دوره‌ای ارزیاب‌ها صفر می‌شود. آمار کلی و تاریخچه ارزیابی‌ها حفظ خواهند شد. ادامه می‌دهی؟", reply_markup: { inline_keyboard: [[{ text: "✅ بله، ریست آمار دوره‌ای", callback_data: "sr_reviewers_reset_do" }], [{ text: "❌ لغو", callback_data: "sr_reviewers:0" }]] } });
    await telegram(env, "answerCallbackQuery", { callback_query_id: callback.id });
    return true;
  }
  if (data === "sr_reviewers_reset_do") {
    if (userId !== Number(OWNER_ID)) {
      await telegram(env, "answerCallbackQuery", { callback_query_id: callback.id, text: "فقط مدیر اصلی می‌تواند آمار را ریست کند.", show_alert: true });
      return true;
    }
    let cursor;
    let resetCount = 0;
    do {
      const options = { prefix: "streamreview:reviewer:", limit: 1000 };
      if (cursor) options.cursor = cursor;
      const page = await env.BOT_STATE.list(options);
      for (const key of page.keys || []) {
        const reviewer = await env.BOT_STATE.get(key.name, "json");
        if (!reviewer) continue;
        reviewer.roundCount = 0;
        await env.BOT_STATE.put(key.name, JSON.stringify(reviewer));
        resetCount++;
      }
      cursor = page.list_complete ? undefined : page.cursor;
    } while (cursor);
    await telegram(env, "answerCallbackQuery", { callback_query_id: callback.id, text: "آمار دوره‌ای ریست شد؛ آمار کلی حفظ شد." });
    await telegram(env, "sendMessage", { chat_id: chatId, text: `✅ آمار دوره‌ای ارزیاب‌ها ریست شد.\n👥 رکوردهای به‌روزشده: ${resetCount}\n📚 آمار کلی و تاریخچه ارزیابی‌ها دست‌نخورده ماندند.`, reply_markup: { inline_keyboard: [[{ text: "📋 مشاهده آمار ارزیاب‌ها", callback_data: "sr_reviewers:0" }]] } });
    return true;
  }
  if (data.startsWith("sr_reviewers:")) {
    if (userId !== Number(OWNER_ID)) {
      await telegram(env, "answerCallbackQuery", { callback_query_id: callback.id, text: "فقط مدیر اصلی می‌تواند آمار ارزیاب‌ها را ببیند.", show_alert: true });
      return true;
    }
    await sendStreamReviewReviewerList(env, chatId, Number(data.split(":")[1] || 0));
    await telegram(env, "answerCallbackQuery", { callback_query_id: callback.id });
    return true;
  }
  if (data.startsWith("streamreview_target_stats:")) {
    if (userId !== Number(OWNER_ID)) {
      await telegram(env, "answerCallbackQuery", { callback_query_id: callback.id, text: "❌ فقط مدیر می‌تواند این گزارش را ببیند.", show_alert: true });
      return true;
    }
    await sendStreamReviewTargetStats(env, chatId, Number(data.split(":")[1]));
    await telegram(env, "answerCallbackQuery", { callback_query_id: callback.id });
    return true;
  }
  if (data.startsWith("sr_")) {
    const parts = data.split(":");
    const action = parts[0];
    const sessionId = parts[1];
    const session = await getStreamReviewSession(env, sessionId);
    if (!session) {
      await telegram(env, "answerCallbackQuery", { callback_query_id: callback.id, text: "❌ این ارزیابی پیدا نشد یا منقضی شده است.", show_alert: true });
      return true;
    }
    if (action === "sr_results") {
      if (userId !== Number(OWNER_ID)) {
        await telegram(env, "answerCallbackQuery", { callback_query_id: callback.id, text: "فقط مدیر اصلی می‌تواند نتیجه ارزیابی را ببیند.", show_alert: true });
        return true;
      }
      await sendStreamReviewResults(env, chatId, session);
      await telegram(env, "answerCallbackQuery", { callback_query_id: callback.id });
      return true;
    }
    if (String(session.groupId) !== String(chatId) || String(await getStreamReviewGroupId(env)) !== String(chatId)) {
      await telegram(env, "answerCallbackQuery", { callback_query_id: callback.id, text: "❌ این دکمه فقط در گروه ارزیابی معتبر است.", show_alert: true });
      return true;
    }
    if (!(await isStreamReviewGroupMember(env, chatId, userId))) {
      await telegram(env, "answerCallbackQuery", { callback_query_id: callback.id, text: "❌ فقط اعضای گروه ارزیابی می‌توانند رأی بدهند.", show_alert: true });
      return true;
    }
    if (!(await isQualityAdmin(env, userId))) {
      await telegram(env, "answerCallbackQuery", { callback_query_id: callback.id, text: "❌ فقط افرادی که مدیر برای دسترسی ارزیابی اضافه کرده می‌توانند ارزیابی ثبت کنند.", show_alert: true });
      return true;
    }
    if (Number(session.targetId) === userId) {
      await telegram(env, "answerCallbackQuery", { callback_query_id: callback.id, text: "❌ نمی‌توانی استریم خودت را ارزیابی کنی.", show_alert: true });
      return true;
    }
    if (action === "sr_score") {
      const index = Number(parts[2]);
      const score = Number(parts[3]);
      if (!Number.isInteger(index) || index < 0 || index >= STREAM_REVIEW_ITEMS.length || !Number.isInteger(score) || score < 1 || score > 5) {
        await telegram(env, "answerCallbackQuery", { callback_query_id: callback.id, text: "❌ امتیاز نامعتبر است.", show_alert: true });
        return true;
      }
      const draftKey = `streamreview:draft:${sessionId}:${userId}`;
      let draft = await env.BOT_STATE.get(draftKey, "json");
      if (!draft) {
        const previous = session.evaluations?.[String(userId)];
        draft = { scores: previous ? [...previous.scores] : [], updatedAt: Date.now() };
      }
      draft.scores[index] = score;
      draft.updatedAt = Date.now();
      await env.BOT_STATE.put(draftKey, JSON.stringify(draft), { expirationTtl: 604800 });
      await telegram(env, "answerCallbackQuery", { callback_query_id: callback.id, text: `${STREAM_REVIEW_ITEMS[index]}: ${score}/5 ذخیره شد. معیارهای دیگر را هم انتخاب کن.` });
      return true;
    }
    if (action === "sr_submit") {
      const draftKey = `streamreview:draft:${sessionId}:${userId}`;
      const draft = await env.BOT_STATE.get(draftKey, "json");
      if (!draft || !Array.isArray(draft.scores) || STREAM_REVIEW_ITEMS.some((_, index) => !Number.isInteger(Number(draft.scores[index])) || Number(draft.scores[index]) < 1 || Number(draft.scores[index]) > 5)) {
        await telegram(env, "answerCallbackQuery", { callback_query_id: callback.id, text: "❌ ابتدا برای هر ۵ معیار یک امتیاز از ۱ تا ۵ انتخاب کن.", show_alert: true });
        return true;
      }
      const key = String(userId);
      const previous = session.evaluations?.[key];
      const user = callback.from || {};
      const evaluatorProfile = (await getQualityEvaluators(env)).find(item => Number(item.userId) === userId);
      const evaluatorName = evaluatorProfile?.gameName || [user.first_name, user.last_name].filter(Boolean).join(" ") || user.username || String(userId);
      if (!session.evaluations) session.evaluations = {};
      session.evaluations[key] = {
        userId,
        name: evaluatorName,
        username: String(user.username || ""),
        scores: STREAM_REVIEW_ITEMS.map((_, index) => Number(draft.scores[index])),
        at: Date.now()
      };
      const reviewerKey = `streamreview:reviewer:${userId}`;
      const reviewer = await env.BOT_STATE.get(reviewerKey, "json") || { userId, name: evaluatorName, username: String(user.username || ""), count: 0, roundCount: 0 };
      if (!previous) {
        reviewer.count = Number(reviewer.count || 0) + 1;
        reviewer.roundCount = Number(reviewer.roundCount ?? reviewer.count - 1) + 1;
      }
      reviewer.name = evaluatorName;
      reviewer.gameName = evaluatorProfile?.gameName || evaluatorName;
      reviewer.referral = evaluatorProfile?.referral || "";
      reviewer.username = String(user.username || "");
      reviewer.lastAt = Date.now();
      await env.BOT_STATE.put(reviewerKey, JSON.stringify(reviewer));

      // Award points like the previous evaluation system, but calculate one score per live session
      // from the crowd's average so a large group cannot multiply points simply by voting more.
      const evaluations = Object.values(session.evaluations);
      const allScores = evaluations.flatMap(item => (item.scores || []).map(Number)).filter(Number.isFinite);
      const average = allScores.length ? allScores.reduce((a, b) => a + b, 0) / allScores.length : 0;
      const newSessionPoints = Math.round((average / 5) * 500);
      const delta = newSessionPoints - Number(session.pointsAwarded || 0);
      if (delta !== 0) {
        const targetStats = await getTeamStats(env, session.targetId);
        targetStats.points = Math.max(0, Number(targetStats.points || 0) + delta);
        targetStats.streamReviewPoints = Math.max(0, Number(targetStats.streamReviewPoints || 0) + delta);
        targetStats.quality = {
          average: Number((average * 2).toFixed(2)),
          total: Math.max(0, Number(targetStats.streamReviewPoints || 0)),
          scores: STREAM_REVIEW_ITEMS.map((_, index) => {
            const vals = evaluations.map(item => Number(item.scores?.[index])).filter(Number.isFinite);
            return vals.length ? Number(((vals.reduce((a, b) => a + b, 0) / vals.length) * 2).toFixed(2)) : 0;
          }),
          updatedAt: Date.now()
        };
        await saveTeamStats(env, session.targetId, targetStats);
        session.pointsAwarded = newSessionPoints;
      }
      await env.BOT_STATE.put(`streamreview:session:${sessionId}`, JSON.stringify(session));
      await env.BOT_STATE.delete(draftKey);
      await updateStreamReviewMessage(env, session);
      await telegram(env, "answerCallbackQuery", { callback_query_id: callback.id, text: previous ? "✅ ارزیابی‌ات ویرایش شد؛ امتیاز استریم بروزرسانی شد." : `✅ ارزیابی ثبت شد؛ ${newSessionPoints} پوینت برای استریم محاسبه شد.` });
      return true;
    }
  }
  return false;
}

const TEAM_QUALITY_ITEMS = [
  "🎥 کیفیت تصویر",
  "🎙 کیفیت صدا",
  "📡 پایداری",
  "🎮 گیم‌پلی",
  "🗣 تعامل"
];

async function sendTeamMemberPicker(env, chatId, action) {
  const users = await getTeamUsers(env);
  const rows = [];
  for (const id of users) {
    const profile = await getTelegramProfile(env, id);
    rows.push([{ text: getPublicUserName(profile, id), callback_data: `team_manage_member:${action}:${id}` }]);
  }
  rows.push([{ text: "🔙 برگشت", callback_data: action === "quality" ? "home" : "team_points_manage" }]);
  await telegram(env, "sendMessage", {
    chat_id: chatId,
    text: users.length ? "👥 <b>انتخاب استریمر</b>\n\nشخص موردنظر را انتخاب کن:" : "❌ عضوی برای انتخاب وجود ندارد.",
    parse_mode: "HTML",
    reply_markup: { inline_keyboard: rows }
  });
}

async function sendTeamPointsMenu(env, chatId) {
  return sendTeamDashboard(env, chatId);
}

async function sendIndividualResetPicker(env, chatId) {
  const users = await getTeamUsers(env);
  const rows = [];
  for (const id of users) {
    const profile = await getTelegramProfile(env, id);
    const stats = await getTeamStats(env, id);
    const minutes = Number(await getTotalStreamTime(env, id) || 0);
    const label = `${getPublicUserName(profile, id)} · ⭐${Number(stats.points || 0)} · 🎥${Number(stats.streams || 0)} · ⏱${formatDuration(minutes)}`;
    rows.push([{ text: label.slice(0, 60), callback_data: `team_individual_member:${id}` }]);
  }
  rows.push([{ text: "🔙 مدیریت رنک و امتیاز", callback_data: "team_points_manage" }]);
  await telegram(env, "sendMessage", {
    chat_id: chatId,
    text: users.length ? "👤 <b>انتخاب عضو برای ریست موردی</b>\n\nفقط اطلاعات همان عضو تغییر می‌کند. انتخاب کن:" : "❌ عضوی برای انتخاب وجود ندارد.",
    parse_mode: "HTML",
    reply_markup: { inline_keyboard: rows }
  });
}

async function sendIndividualResetMenu(env, chatId, userId) {
  const id = Number(userId);
  const users = await getTeamUsers(env);
  if (!id || !users.includes(id)) {
    await telegram(env, "sendMessage", { chat_id: chatId, text: "❌ عضو پیدا نشد.", reply_markup: { inline_keyboard: [[{ text: "🔙 فهرست اعضا", callback_data: "team_individual_picker" }]] } });
    return;
  }
  const profile = await getTelegramProfile(env, id);
  const stats = await getTeamStats(env, id);
  const logs = await getTeamAdminLogs(env);
  const lastStream = [...logs].reverse().find(log => log.action === "stream" && Number(log.targetId) === id);
  const reviewStats = await getStreamReviewTargetStats(env, id);
  const qualityText = reviewStats.evaluations ? `${reviewStats.average.toFixed(2)}/5 · ${reviewStats.evaluations} ارزیابی` : "ثبت نشده";
  const text = `👤 <b>مدیریت موردی عضو</b>\n\nنام: <b>${escapeHtml(getPublicUserName(profile, id))}</b>\nشناسه: <code>${id}</code>\n⭐ پوینت فعال: <b>${Number(stats.points || 0)}</b>\n🎁 پوینت پاداش فعال: <b>${Number(stats.bonusPoints || 0)}</b>\n🏆 رتبه: <b>${escapeHtml(teamRank(stats.points))}</b>\n🎥 تعداد استریم: <b>${Number(stats.streams || 0)}</b>\n⏱️ مجموع تایم: <b>${formatDuration(await getTotalStreamTime(env, id))}</b>\n📊 ارزیابی لایو: <b>${qualityText}</b>\n🧾 آخرین ثبت استریم در تاریخچه: <b>${lastStream ? formatDuration(Number(lastStream.details?.minutes || 0)) : "پیدا نشد"}</b>\n\nعملیات فقط روی همین عضو انجام می‌شود:`;
  const rows = [
    [{ text: "⭐ ریست پوینت این عضو", callback_data: `team_individual_confirm:points:${id}` }],
    [{ text: "⏱️ ریست مجموع ساعت", callback_data: `team_individual_confirm:time:${id}` }],
    [{ text: "➕ افزودن تعداد استریم دلخواه", callback_data: `team_individual_stream_adjust:add:${id}` }],
    [{ text: "➖ کم‌کردن تعداد استریم دلخواه", callback_data: `team_individual_stream_adjust:subtract:${id}` }],
    [{ text: "🎥 ریست تعداد استریم", callback_data: `team_individual_confirm:streams:${id}` }],
    [{ text: "🧪 حذف آخرین استریم تستی", callback_data: `team_individual_confirm:laststream:${id}` }],
    [{ text: "📊 مشاهده ارزیابی‌های لایو", callback_data: `streamreview_target_stats:${id}` }],
    [{ text: "🔙 انتخاب عضو دیگر", callback_data: "team_individual_picker" }],
    [{ text: "🔙 مدیریت رنک و امتیاز", callback_data: "team_points_manage" }]
  ];
  await telegram(env, "sendMessage", { chat_id: chatId, text, parse_mode: "HTML", reply_markup: { inline_keyboard: rows } });
}

async function promptIndividualStreamCountAdjust(env, chatId, action, userId) {
  const id = Number(userId);
  const users = await getTeamUsers(env);
  if (!id || !users.includes(id) || !["add", "subtract"].includes(action)) {
    await telegram(env, "sendMessage", { chat_id: chatId, text: "❌ عضو یا عملیات نامعتبر است." });
    return;
  }
  await env.BOT_STATE.put(`team:stream_count_adjust_state:${chatId}`, JSON.stringify({ targetId: id, action }), { expirationTtl: 900 });
  const profile = await getTelegramProfile(env, id);
  await telegram(env, "sendMessage", {
    chat_id: chatId,
    text: `👤 عضو: <b>${escapeHtml(getPublicUserName(profile, id))}</b>

${action === "add" ? "➕ چند استریم اضافه کنم؟" : "➖ چند استریم کم کنم؟"}

فقط یک عدد صحیح مثبت بفرست؛ مثلاً <code>10</code>. این تغییر در تعداد فعلی، مادام‌العمر و آمار کلی رتبه‌بندی اعمال می‌شود. تایم استریم تغییر نمی‌کند.`,
    parse_mode: "HTML",
    reply_markup: { inline_keyboard: [[{ text: "❌ لغو", callback_data: `team_input_cancel:stream_count:${id}` }]] }
  });
}

async function adjustIndividualStreamCount(env, chatId, action, userId, amount = 1) {
  const id = Number(userId);
  const users = await getTeamUsers(env);
  amount = Number(amount);
  if (!id || !users.includes(id) || !["add", "subtract"].includes(action) || !Number.isInteger(amount) || amount < 1 || amount > 1000000) {
    await telegram(env, "sendMessage", { chat_id: chatId, text: "❌ عضو، عملیات یا تعداد نامعتبر است." });
    return;
  }
  await ensureLifetimeStreamStats(env, id);
  const stats = await getTeamStats(env, id);
  const lifetime = await getLifetimeStreamStats(env, id);
  const oldCurrent = Math.max(0, Number(stats.streams || 0));
  const oldLifetime = Math.max(0, Number(lifetime.streams || 0));
  const delta = action === "add" ? amount : -amount;
  if (delta < 0 && oldCurrent === 0 && oldLifetime === 0) {
    await telegram(env, "sendMessage", { chat_id: chatId, text: "⚠️ تعداد استریم فعلی و مادام‌العمر این عضو هر دو صفر هستند؛ چیزی کم نشد.", reply_markup: { inline_keyboard: [[{ text: "🔙 بازگشت به مدیریت عضو", callback_data: `team_individual_member:${id}` }]] } });
    return;
  }
  stats.streams = Math.max(0, oldCurrent + delta);
  lifetime.streams = Math.max(0, oldLifetime + delta);
  await saveTeamStats(env, id, stats);
  await env.BOT_STATE.put(`team:lifetime_streams:${id}`, JSON.stringify(lifetime));
  await addTeamAdminLog(env, "stream_count_adjust", id, { delta: stats.streams - oldCurrent, requestedDelta: delta, currentStreams: stats.streams, lifetimeStreams: lifetime.streams, lifetimeDelta: lifetime.streams - oldLifetime, source: "admin_manual_adjustment" });
  const actualLifetimeDelta = lifetime.streams - oldLifetime;
  const verb = actualLifetimeDelta >= 0 ? `${actualLifetimeDelta.toLocaleString("en-US")} استریم اضافه شد` : `${Math.abs(actualLifetimeDelta).toLocaleString("en-US")} استریم کم شد`;
  await telegram(env, "sendMessage", {
    chat_id: chatId,
    text: `✅ ${verb}.

🎥 تعداد فعلی عضو: <b>${stats.streams.toLocaleString("en-US")}</b>
📚 تعداد مادام‌العمر عضو: <b>${lifetime.streams.toLocaleString("en-US")}</b>

مجموع استریم‌های کلی رتبه‌بندی بر اساس آمار مادام‌العمر به‌روز می‌شود. تایم استریم تغییر نمی‌کند.`,
    parse_mode: "HTML",
    reply_markup: { inline_keyboard: [[{ text: "🔙 مدیریت همین عضو", callback_data: `team_individual_member:${id}` }], [{ text: "🏆 رتبه‌بندی تیم", callback_data: "team_leaderboard" }]] }
  });
}

async function getCompanyDonationEntries(env) {
  const entries = await env.BOT_STATE.get("team:company_donation_entries", "json");
  return Array.isArray(entries) ? entries : [];
}

async function saveCompanyDonationEntries(env, entries) {
  await env.BOT_STATE.put("team:company_donation_entries", JSON.stringify(entries));
}

async function addCompanyDonation(env, chatId, amount) {
  const key = "team:company_donations_total";
  const current = Math.max(0, Number(await env.BOT_STATE.get(key) || 0));
  const total = current + amount;
  const entries = await getCompanyDonationEntries(env);
  const entry = { id: `${Date.now()}${Math.floor(Math.random() * 900 + 100)}`, amount, createdAt: Date.now(), createdBy: Number(chatId) };
  entries.push(entry);
  await saveCompanyDonationEntries(env, entries);
  await env.BOT_STATE.put(key, String(total));
  await addTeamAdminLog(env, "company_donation_add", 0, { entryId: entry.id, amount, total, source: "admin_manual_donation" });
  await telegram(env, "sendMessage", {
    chat_id: chatId,
    text: `✅ دونیت مجموعه ثبت شد و به مجموع قبلی اضافه شد.

➕ مبلغ جدید: <b>${amount.toLocaleString("en-US")}</b>
🎁 مجموع دونیت مجموعه: <b>${total.toLocaleString("en-US")}</b>
📒 این ثبت در دفترچه دونیت ذخیره شد.

این مبلغ فقط در بخش آمار کلی رتبه‌بندی نمایش داده می‌شود و به آمار هیچ عضو خاصی اضافه نمی‌شود.`,
    parse_mode: "HTML",
    reply_markup: { inline_keyboard: [[{ text: "📒 مشاهده دفترچه دونیت", callback_data: "team_company_donation_ledger" }], [{ text: "🏆 مشاهده رتبه‌بندی و آمار کلی", callback_data: "team_leaderboard" }], [{ text: "🔙 داشبورد مدیریت", callback_data: "team_dashboard" }]] }
  });
}

async function sendCompanyDonationLedger(env, chatId) {
  const total = Math.max(0, Number(await env.BOT_STATE.get("team:company_donations_total") || 0));
  const entries = await getCompanyDonationEntries(env);
  const recent = [...entries].sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0)).slice(0, 12);
  let text = `📒 <b>دفترچه دونیت مجموعه</b>

🎁 مجموع کل ثبت‌شده: <b>${total.toLocaleString("en-US")}</b>
🧾 تعداد ثبت‌های موجود در دفترچه: <b>${entries.length.toLocaleString("en-US")}</b>

`;
  if (!entries.length) {
    text += "هنوز ثبت جدیدی در دفترچه وجود ندارد. اگر مجموع قبلی از قبل در سیستم ثبت شده باشد، حفظ شده و در مجموع کل دیده می‌شود؛ ثبت‌های جدید از اینجا به بعد در دفترچه ذخیره می‌شوند.";
  } else {
    text += "آخرین ثبت‌ها (حداکثر ۱۲ مورد):";
    for (const entry of recent) {
      const date = entry.createdAt ? new Date(entry.createdAt).toLocaleString("fa-IR", { timeZone: "Asia/Baku" }) : "تاریخ نامشخص";
      text += `🧾 <b>${Number(entry.amount || 0).toLocaleString("en-US")}</b> — ${escapeHtml(date)}
`;
    }
    if (entries.length > recent.length) text += `
نمایش ${recent.length} ثبت از ${entries.length} ثبت. برای اصلاح یا حذف، یکی از ثبت‌های زیر را انتخاب کن:`;
    else text += "برای اصلاح یا حذف، یکی از ثبت‌های زیر را انتخاب کن:";
  }
  const rows = [];
  for (const entry of recent) {
    const date = entry.createdAt ? new Date(entry.createdAt).toLocaleDateString("fa-IR", { timeZone: "Asia/Baku" }) : "بدون تاریخ";
    rows.push([{ text: `✏️ ${Number(entry.amount || 0).toLocaleString("en-US")} · ${date}`, callback_data: `team_company_donation_entry:${entry.id}` }]);
  }
  rows.push([{ text: "➕ ثبت دونیت جدید", callback_data: "team_company_donation_add" }]);
  rows.push([{ text: "🏆 مشاهده آمار کلی", callback_data: "team_leaderboard" }, { text: "🔙 داشبورد مدیریت", callback_data: "team_dashboard" }]);
  await telegram(env, "sendMessage", { chat_id: chatId, text, parse_mode: "HTML", reply_markup: { inline_keyboard: rows } });
}

async function sendCompanyDonationEntryMenu(env, chatId, entryId) {
  const entries = await getCompanyDonationEntries(env);
  const entry = entries.find(item => String(item.id) === String(entryId));
  if (!entry) {
    await telegram(env, "sendMessage", { chat_id: chatId, text: "❌ این ثبت در دفترچه پیدا نشد؛ احتمالاً قبلاً حذف شده است.", reply_markup: { inline_keyboard: [[{ text: "📒 بازگشت به دفترچه دونیت", callback_data: "team_company_donation_ledger" }]] } });
    return;
  }
  const date = entry.createdAt ? new Date(entry.createdAt).toLocaleString("fa-IR", { timeZone: "Asia/Baku" }) : "تاریخ نامشخص";
  await telegram(env, "sendMessage", { chat_id: chatId, text: `🧾 <b>جزئیات ثبت دونیت</b>

💰 مبلغ: <b>${Number(entry.amount || 0).toLocaleString("en-US")}</b>
📅 تاریخ ثبت: ${escapeHtml(date)}
🆔 شناسه: <code>${escapeHtml(entry.id)}</code>

می‌توانی مبلغ این ثبت را اصلاح کنی یا فقط همین ثبت را حذف کنی. مجموع دونیت پس از عملیات به‌صورت خودکار محاسبه می‌شود.`, parse_mode: "HTML", reply_markup: { inline_keyboard: [[{ text: "✏️ اصلاح مبلغ", callback_data: `team_company_donation_edit:${entry.id}` }], [{ text: "🗑 حذف این ثبت", callback_data: `team_company_donation_delete_confirm:${entry.id}` }], [{ text: "🔙 دفترچه دونیت", callback_data: "team_company_donation_ledger" }]] } });
}

async function editCompanyDonationPrompt(env, chatId, entryId) {
  const entries = await getCompanyDonationEntries(env);
  const entry = entries.find(item => String(item.id) === String(entryId));
  if (!entry) { await telegram(env, "sendMessage", { chat_id: chatId, text: "❌ ثبت دونیت پیدا نشد.", reply_markup: { inline_keyboard: [[{ text: "📒 دفترچه دونیت", callback_data: "team_company_donation_ledger" }]] } }); return; }
  await env.BOT_STATE.put(`team:company_donation_edit_state:${chatId}`, JSON.stringify({ entryId: String(entryId), createdAt: Date.now() }), { expirationTtl: 900 });
  await telegram(env, "sendMessage", { chat_id: chatId, text: `✏️ مبلغ جدید این ثبت را بفرست.

مبلغ فعلی: <b>${Number(entry.amount || 0).toLocaleString("en-US")}</b>

فقط مجموع به‌اندازه اختلاف مبلغ تغییر می‌کند و سایر ثبت‌ها دست‌نخورده می‌مانند.`, parse_mode: "HTML", reply_markup: { inline_keyboard: [[{ text: "❌ لغو", callback_data: "team_input_cancel:donation_edit" }]] } });
}

async function editCompanyDonation(env, chatId, entryId, newAmount) {
  const entries = await getCompanyDonationEntries(env);
  const index = entries.findIndex(item => String(item.id) === String(entryId));
  if (index < 0) { await telegram(env, "sendMessage", { chat_id: chatId, text: "❌ ثبت دونیت پیدا نشد یا قبلاً تغییر کرده است." }); return; }
  const oldAmount = Number(entries[index].amount || 0);
  const total = Math.max(0, Number(await env.BOT_STATE.get("team:company_donations_total") || 0) - oldAmount + newAmount);
  entries[index] = { ...entries[index], amount: newAmount, editedAt: Date.now() };
  await saveCompanyDonationEntries(env, entries);
  await env.BOT_STATE.put("team:company_donations_total", String(total));
  await addTeamAdminLog(env, "company_donation_edit", 0, { entryId: String(entryId), oldAmount, newAmount, total });
  await telegram(env, "sendMessage", { chat_id: chatId, text: `✅ مبلغ ثبت دونیت اصلاح شد.

مبلغ قبلی: <b>${oldAmount.toLocaleString("en-US")}</b>
مبلغ جدید: <b>${newAmount.toLocaleString("en-US")}</b>
🎁 مجموع دونیت مجموعه: <b>${total.toLocaleString("en-US")}</b>`, parse_mode: "HTML", reply_markup: { inline_keyboard: [[{ text: "📒 دفترچه دونیت", callback_data: "team_company_donation_ledger" }], [{ text: "🏆 رتبه‌بندی و آمار کلی", callback_data: "team_leaderboard" }]] } });
}

async function deleteCompanyDonation(env, chatId, entryId) {
  const entries = await getCompanyDonationEntries(env);
  const entry = entries.find(item => String(item.id) === String(entryId));
  if (!entry) { await telegram(env, "sendMessage", { chat_id: chatId, text: "❌ ثبت دونیت پیدا نشد یا قبلاً حذف شده است.", reply_markup: { inline_keyboard: [[{ text: "📒 دفترچه دونیت", callback_data: "team_company_donation_ledger" }]] } }); return; }
  const remaining = entries.filter(item => String(item.id) !== String(entryId));
  const total = Math.max(0, Number(await env.BOT_STATE.get("team:company_donations_total") || 0) - Number(entry.amount || 0));
  await saveCompanyDonationEntries(env, remaining);
  await env.BOT_STATE.put("team:company_donations_total", String(total));
  await addTeamAdminLog(env, "company_donation_delete", 0, { entryId: String(entryId), amount: Number(entry.amount || 0), total });
  await telegram(env, "sendMessage", { chat_id: chatId, text: `🗑 ثبت دونیت حذف شد.

مبلغ حذف‌شده: <b>${Number(entry.amount || 0).toLocaleString("en-US")}</b>
🎁 مجموع دونیت مجموعه: <b>${total.toLocaleString("en-US")}</b>`, parse_mode: "HTML", reply_markup: { inline_keyboard: [[{ text: "📒 دفترچه دونیت", callback_data: "team_company_donation_ledger" }], [{ text: "🏆 رتبه‌بندی و آمار کلی", callback_data: "team_leaderboard" }]] } });
}

async function confirmIndividualReset(env, chatId, action, userId) {
  const id = Number(userId);
  const users = await getTeamUsers(env);
  if (!id || !users.includes(id)) {
    await telegram(env, "sendMessage", { chat_id: chatId, text: "❌ عضو نامعتبر است.", reply_markup: { inline_keyboard: [[{ text: "🔙 فهرست اعضا", callback_data: "team_individual_picker" }]] } });
    return;
  }
  const descriptions = {
    points: ["⭐ ریست پوینت عضو", "پوینت فعال و پوینت پاداش این عضو صفر می‌شوند. تایم، تعداد استریم و تاریخچه‌ها تغییر نمی‌کنند."],
    time: ["⏱️ ریست مجموع ساعت عضو", "فقط مجموع ساعت استریم این عضو صفر می‌شود. تعداد استریم، پوینت‌ها و نمره ارزیابی تغییر نمی‌کنند."],
    streams: ["🎥 ریست تعداد استریم عضو", "فقط شمارنده تعداد استریم این عضو صفر می‌شود. مجموع ساعت، پوینت‌ها و نمره ارزیابی حفظ می‌شوند."],
    laststream: ["🧪 حذف آخرین استریم ثبت‌شده", "آخرین ثبت استریم این عضو از تاریخچه مدیریتی حذف می‌شود و مدت آن از مجموع ساعت و یک عدد از تعداد استریم کم می‌شود؛ اگر ثبت قابل تطبیق پیدا نشود، چیزی تغییر نمی‌کند."],
    quality: ["🎯 ریست نمره فعلی عضو", "فقط ارزیابی فعلی این عضو پاک می‌شود. پوینت‌ها، تایم، تعداد استریم و تاریخچه ارزیابی حفظ می‌شوند."],
    history: ["🗑 پاک‌کردن تاریخچه ارزیابی عضو", "فقط تاریخچه ارزیابی‌های این عضو پاک می‌شود. پوینت‌ها و نمره فعلی تغییر نمی‌کنند."]
  };
  if (!descriptions[action]) return;
  const [heading, description] = descriptions[action];
  const profile = await getTelegramProfile(env, id);
  await telegram(env, "sendMessage", {
    chat_id: chatId,
    text: `⚠️ <b>${heading}</b>\n\n👤 ${escapeHtml(getPublicUserName(profile, id))}\n🆔 <code>${id}</code>\n\n${description}\n\nاین عملیات فقط برای همین عضو اجرا می‌شود. تأیید می‌کنی؟`,
    parse_mode: "HTML",
    reply_markup: { inline_keyboard: [[{ text: "✅ تأیید", callback_data: `team_individual_do:${action}:${id}` }], [{ text: "❌ لغو و بازگشت", callback_data: `team_individual_member:${id}` }]] }
  });
}

async function applyIndividualReset(env, chatId, action, userId) {
  const id = Number(userId);
  const users = await getTeamUsers(env);
  if (!id || !users.includes(id)) {
    await telegram(env, "sendMessage", { chat_id: chatId, text: "❌ عضو نامعتبر است." });
    return;
  }
  // Capture current totals before any individual time/stream reset can zero them.
  if (action === "time" || action === "streams" || action === "laststream") {
    await ensureLifetimeStreamStats(env, id);
  }
  const stats = await getTeamStats(env, id);
  let message = "";
  if (action === "points") {
    stats.points = 0;
    stats.bonusPoints = 0;
    stats.streamReviewPoints = 0;
    if (stats.quality && typeof stats.quality === "object") stats.quality.total = 0;
    let reviewCursor;
    do {
      const options = { prefix: "streamreview:session:", limit: 1000 };
      if (reviewCursor) options.cursor = reviewCursor;
      const page = await env.BOT_STATE.list(options);
      for (const entry of page.keys || []) {
        const session = await env.BOT_STATE.get(entry.name, "json");
        if (session && Number(session.targetId) === id && Number(session.pointsAwarded || 0) > 0) {
          session.pointsAwarded = 0;
          await env.BOT_STATE.put(entry.name, JSON.stringify(session));
        }
      }
      reviewCursor = page.list_complete ? undefined : page.cursor;
    } while (reviewCursor);
    await saveTeamStats(env, id, stats);
    message = "⭐ پوینت فعال و پوینت پاداش این عضو صفر شد. تایم و تعداد استریم تغییر نکرد.";
  } else if (action === "time") {
    await setStreamTime(env, id, 0);
    message = "⏱️ مجموع ساعت استریم این عضو صفر شد. تعداد استریم و پوینت‌ها تغییر نکرد.";
  } else if (action === "streams") {
    stats.streams = 0;
    stats.lastStreamAt = 0;
    await saveTeamStats(env, id, stats);
    message = "🎥 تعداد استریم این عضو صفر شد. مجموع ساعت و پوینت‌ها تغییر نکرد.";
  } else if (action === "quality") {
    const evaluationPoints = Math.max(0, Number(stats.streamReviewPoints || 0));
    stats.points = Math.max(0, Number(stats.points || 0) - evaluationPoints);
    stats.streamReviewPoints = 0;
    stats.quality = null;
    let reviewCursor;
    do {
      const options = { prefix: "streamreview:session:", limit: 1000 };
      if (reviewCursor) options.cursor = reviewCursor;
      const page = await env.BOT_STATE.list(options);
      for (const entry of page.keys || []) {
        const session = await env.BOT_STATE.get(entry.name, "json");
        if (session && Number(session.targetId) === id && Number(session.pointsAwarded || 0) > 0) {
          session.pointsAwarded = 0;
          await env.BOT_STATE.put(entry.name, JSON.stringify(session));
        }
      }
      reviewCursor = page.list_complete ? undefined : page.cursor;
    } while (reviewCursor);
    await saveTeamStats(env, id, stats);
    message = "🎯 نمره فعلی و پوینت‌های حاصل از ارزیابی این عضو صفر شد؛ پوینت پاداش و تاریخچه حفظ شدند.";
  } else if (action === "history") {
    const count = Array.isArray(stats.qualityHistory) ? stats.qualityHistory.length : 0;
    stats.qualityHistory = [];
    await saveTeamStats(env, id, stats);
    message = `🗑 تاریخچه ارزیابی این عضو پاک شد. تعداد سوابق حذف‌شده: ${count}. پوینت‌ها و نمره فعلی تغییر نکردند.`;
  } else if (action === "laststream") {
    const logs = await getTeamAdminLogs(env);
    let index = -1;
    for (let i = logs.length - 1; i >= 0; i--) {
      if (logs[i].action === "stream" && Number(logs[i].targetId) === id) { index = i; break; }
    }
    if (index < 0) {
      message = "⚠️ هیچ ثبت استریم قابل حذف در تاریخچه مدیریتی برای این عضو پیدا نشد؛ اطلاعات تغییر نکرد.";
    } else {
      const log = logs[index];
      const minutes = Math.max(0, Number(log.details?.minutes || 0));
      const currentMinutes = Number(await getTotalStreamTime(env, id) || 0);
      await setStreamTime(env, id, Math.max(0, currentMinutes - minutes));
      stats.streams = Math.max(0, Number(stats.streams || 0) - 1);
      const remainingStreamLogs = logs.filter((entry, i) => i !== index && entry.action === "stream" && Number(entry.targetId) === id);
      stats.lastStreamAt = remainingStreamLogs.length ? Number(remainingStreamLogs[remainingStreamLogs.length - 1].at || 0) : 0;
      await saveTeamStats(env, id, stats);
      logs.splice(index, 1);
      await env.BOT_STATE.put("team:admin_logs", JSON.stringify(logs));
      message = `🧪 آخرین ثبت استریم حذف شد. ${formatDuration(minutes)} از مجموع ساعت و یک استریم از شمارنده کم شد.`;
    }
  } else return;
  await addTeamAdminLog(env, `individual_${action}_reset`, id, {});
  const profile = await getTelegramProfile(env, id);
  await telegram(env, "sendMessage", {
    chat_id: chatId,
    text: `✅ <b>عملیات انجام شد</b>\n\n👤 ${escapeHtml(getPublicUserName(profile, id))}\n${message}`,
    parse_mode: "HTML",
    reply_markup: { inline_keyboard: [[{ text: "👤 مدیریت همین عضو", callback_data: `team_individual_member:${id}` }], [{ text: "👥 انتخاب عضو دیگر", callback_data: "team_individual_picker" }], [{ text: "🔙 مدیریت رنک و امتیاز", callback_data: "team_points_manage" }]] }
  });
}

async function sendTeamRankList(env, chatId) {
  let text = "🏅 <b>سیستم رنک تیم</b>\n\n";
  for (const [rank, min] of teamRankList()) text += `${rank} — <b>${min}</b> پوینت\n`;
  text += "\n⭐ امتیاز کیفیت: مجموع ۵ نمره × ۱۰\n🎁 پاداش‌های دستی هم به امتیاز کل اضافه می‌شوند.";
  await telegram(env, "sendMessage", { chat_id: chatId, text, parse_mode: "HTML", reply_markup: { inline_keyboard: [[{ text: "🔙 مدیریت رنک و امتیاز", callback_data: "team_points_manage" }]] } });
}

async function startTeamQuality(env, chatId, userId) {
  const state = { targetId: Number(userId), index: 0, scores: [], startedAt: Date.now() };
  await env.BOT_STATE.put(`team:quality_state:${chatId}`, JSON.stringify(state), { expirationTtl: 1800 });
  await sendTeamQualityScore(env, chatId, state);
}

async function sendTeamQualityScore(env, chatId, state) {
  const item = TEAM_QUALITY_ITEMS[state.index];
  const buttons = [];
  for (let i = 0; i <= 10; i += 1) buttons.push({ text: String(i), callback_data: `team_quality_score:${i}` });
  const rows = [];
  for (let i = 0; i < buttons.length; i += 6) rows.push(buttons.slice(i, i + 6));
  const profile = await getTelegramProfile(env, state.targetId);
  await telegram(env, "sendMessage", {
    chat_id: chatId,
    text: `🎯 <b>ارزیابی کیفیت</b>\n\n👤 ${escapeHtml(getPublicUserName(profile, state.targetId))}\n\n<b>${item}</b>\nنمره را از ۰ تا ۱۰ انتخاب کن.\n\nمرحله ${state.index + 1} از ${TEAM_QUALITY_ITEMS.length}`,
    parse_mode: "HTML",
    reply_markup: { inline_keyboard: rows }
  });
}

async function finishTeamQuality(env, chatId, state) {
  const total = state.scores.reduce((a, b) => a + Number(b), 0);
  const points = total * 10;
  const average = total / TEAM_QUALITY_ITEMS.length;
  const stats = await getTeamStats(env, state.targetId);
  stats.points = Number(stats.points || 0) + points;
  stats.quality = { average: Number(average.toFixed(2)), total: points, scores: state.scores, updatedAt: Date.now() };
  if (!Array.isArray(stats.qualityHistory)) stats.qualityHistory = [];
  stats.qualityHistory.push({ scores: state.scores, average: Number(average.toFixed(2)), points, at: Date.now() });
  if (stats.qualityHistory.length > 30) stats.qualityHistory = stats.qualityHistory.slice(-30);
  await saveTeamStats(env, state.targetId, stats);
  await addTeamAdminLog(env, "quality", state.targetId, { points, average: Number(average.toFixed(2)), scores: state.scores });
  await env.BOT_STATE.delete(`team:quality_state:${chatId}`);
  const profile = await getTelegramProfile(env, state.targetId);
  await telegram(env, "sendMessage", {
    chat_id: chatId,
    text: `✅ <b>ارزیابی ثبت شد</b>\n\n👤 ${escapeHtml(getPublicUserName(profile, state.targetId))}\n📌 وضعیت: <b>${stats.status === "Trial" && Number(stats.trialUntil || 0) > Date.now() ? `🧪 Trial تا ${new Date(Number(stats.trialUntil)).toLocaleDateString("en-GB")}` : escapeHtml(String(stats.status || "Active"))}</b>\n⭐ پوینت این ارزیابی: <b>+${points}</b>\n📊 میانگین کیفیت: <b>${average.toFixed(2)}/10</b>\n🏆 رنک فعلی: <b>${teamRank(stats.points)}</b>\n⭐ مجموع پوینت: <b>${stats.points}</b>`,
    parse_mode: "HTML",
    reply_markup: { inline_keyboard: [[{ text: "🎯 ارزیابی نفر دیگر", callback_data: "team_quality_members" }], [{ text: "🔙 انتخاب عضو برای ارزیابی", callback_data: "team_quality_members" }]] }
  });
}

async function startTeamBonus(env, chatId, userId) {
  await env.BOT_STATE.put(`team:bonus_state:${chatId}`, JSON.stringify({ targetId: Number(userId), startedAt: Date.now() }), { expirationTtl: 900 });
  const profile = await getTelegramProfile(env, userId);
  await telegram(env, "sendMessage", { chat_id: chatId, text: `🎁 <b>افزودن پاداش</b>\n\n👤 ${escapeHtml(getPublicUserName(profile, userId))}\n\nمقدار پوینت پاداش را به صورت عدد بفرست.\nمثال: <b>100</b>`, parse_mode: "HTML" });
}

async function finishTeamBonus(env, chatId, userId, points) {
  const stats = await getTeamStats(env, userId);
  stats.points = Number(stats.points || 0) + points;
  stats.bonusPoints = Number(stats.bonusPoints || 0) + points;
  if (!Array.isArray(stats.bonusHistory)) stats.bonusHistory = [];
  stats.bonusHistory.push({ points, at: Date.now() });
  if (stats.bonusHistory.length > 50) stats.bonusHistory = stats.bonusHistory.slice(-50);
  await saveTeamStats(env, userId, stats);
  await addTeamAdminLog(env, "bonus", userId, { points: Number(points) });
  await env.BOT_STATE.delete(`team:bonus_state:${chatId}`);
  const profile = await getTelegramProfile(env, userId);
  await telegram(env, "sendMessage", { chat_id: chatId, text: `✅ <b>پاداش ثبت شد</b>\n\n👤 ${escapeHtml(getPublicUserName(profile, userId))}\n🎁 پاداش: <b>+${points}</b> پوینت\n⭐ مجموع پوینت: <b>${stats.points}</b>\n🏆 رنک: <b>${teamRank(stats.points)}</b>`, parse_mode: "HTML", reply_markup: { inline_keyboard: [[{ text: "🎁 پاداش نفر دیگر", callback_data: "team_bonus_members" }], [{ text: "🔙 مدیریت رنک و امتیاز", callback_data: "team_points_manage" }]] } });
}

async function resetTeamQualityCurrent(env, chatId) {
  const users = await getTeamUsers(env);
  for (const id of users) {
    const stats = await getTeamStats(env, id);
    const evaluationPoints = Math.max(0, Number(stats.streamReviewPoints || 0));
    stats.points = Math.max(0, Number(stats.points || 0) - evaluationPoints);
    stats.streamReviewPoints = 0;
    stats.quality = null;
    await saveTeamStats(env, id, stats);
    let reviewCursor;
    do {
      const options = { prefix: "streamreview:session:", limit: 1000 };
      if (reviewCursor) options.cursor = reviewCursor;
      const page = await env.BOT_STATE.list(options);
      for (const entry of page.keys || []) {
        const session = await env.BOT_STATE.get(entry.name, "json");
        if (session && Number(session.targetId) === Number(id) && Number(session.pointsAwarded || 0) > 0) {
          session.pointsAwarded = 0;
          await env.BOT_STATE.put(entry.name, JSON.stringify(session));
        }
      }
      reviewCursor = page.list_complete ? undefined : page.cursor;
    } while (reviewCursor);
  }
  await addTeamAdminLog(env, "quality_reset", 0, { count: users.length });
  await telegram(env, "sendMessage", { chat_id: chatId, text: `✅ <b>نمره و پوینت ارزیابی ریست شدند.</b>\n\n👥 اعضای ریست‌شده: <b>${users.length}</b>\n🎯 نمره فعلی ارزیابی پاک شد.\n⭐ فقط پوینت‌های حاصل از ارزیابی از امتیاز فعال کسر و صفر شدند؛ پوینت‌های پاداش حفظ شدند.\n📚 تاریخچه ارزیابی‌ها حفظ شد.`, parse_mode: "HTML", reply_markup: { inline_keyboard: [[{ text: "🔙 مدیریت رنک و امتیاز", callback_data: "team_points_manage" }]] } });
}

async function resetTeamTime(env, chatId) {
  const users = await getTeamUsers(env);
  for (const id of users) {
    // Preserve the all-time totals BEFORE resetting the current-period counters.
    await ensureLifetimeStreamStats(env, id);
    const stats = await getTeamStats(env, id);
    stats.streams = 0;
    stats.lastStreamAt = 0;
    await env.BOT_STATE.put(`totalstream:${id}`, JSON.stringify({ minutes: 0 }));
    await saveTeamStats(env, id, stats);
  }
  await addTeamAdminLog(env, "time_reset", 0, { count: users.length });
  await telegram(env, "sendMessage", { chat_id: chatId, text: `✅ <b>ریست تایم انجام شد.</b>\n\n👥 اعضای ریست‌شده: <b>${users.length}</b>\n🎥 تعداد استریم و مجموع تایم: صفر\n⭐ امتیازها و نمره ارزیابی: بدون تغییر\n📚 تاریخچه ارزیابی‌ها: حفظ شد.`, parse_mode: "HTML", reply_markup: { inline_keyboard: [[{ text: "🔙 مدیریت رنک و امتیاز", callback_data: "team_points_manage" }]] } });
}

async function resetTeamPoints(env, chatId) {
  const users = await getTeamUsers(env);
  for (const id of users) {
    const stats = await getTeamStats(env, id);
    stats.points = 0;
    stats.bonusPoints = 0;
    stats.streamReviewPoints = 0;
    if (stats.quality && typeof stats.quality === "object") stats.quality.total = 0;
    await saveTeamStats(env, id, stats);
  }
  if (env.BOT_STATE) {
    let cursor;
    do {
      const options = { prefix: "streamreview:session:", limit: 1000 };
      if (cursor) options.cursor = cursor;
      const page = await env.BOT_STATE.list(options);
      for (const key of page.keys || []) {
        const session = await env.BOT_STATE.get(key.name, "json");
        if (session && Number(session.pointsAwarded || 0) > 0) {
          session.pointsAwarded = 0;
          await env.BOT_STATE.put(key.name, JSON.stringify(session));
        }
      }
      cursor = page.list_complete ? undefined : page.cursor;
    } while (cursor);
  }
  await addTeamAdminLog(env, "points_reset", 0, { count: users.length });
  await telegram(env, "sendMessage", { chat_id: chatId, text: `✅ <b>تمام امتیازهای فعال ریست شدند.</b>\n\n👥 اعضای ریست‌شده: <b>${users.length}</b>\n⭐ مجموع امتیاز فعال: صفر\n🎁 امتیاز پاداش فعال: صفر\n🎯 امتیاز عددی ارزیابی فعلی: صفر\n\n⏱️ تایم و تعداد استریم تغییر نکرد. نمره‌های کیفیت و تاریخچه ارزیابی‌ها حفظ شدند؛ تاریخچه را از گزینه جداگانه پاک کن.`, parse_mode: "HTML", reply_markup: { inline_keyboard: [[{ text: "🔙 مدیریت رنک و امتیاز", callback_data: "team_points_manage" }]] } });
}
async function sendTeamProfile(env, chatId, userId, viewerId = userId) {
  const profile = await getTelegramProfile(env, userId);
  const stats = await getTeamStats(env, userId);
  const totalMinutes = await getTotalStreamTime(env, userId);
  const lifetimeStreams = await getLifetimeStreamStats(env, userId);
  const lifetimePay = await getLifetimePaidTotals(env, userId);
  const referral = await getUserReferral(env, userId);
  const rank = teamRank(stats.points);
  const trial = stats.trialUntil ? new Date(stats.trialUntil).toLocaleDateString("en-GB") : "-";
  const reviewStats = await getStreamReviewTargetStats(env, userId);
  const qualityText = reviewStats.evaluations
    ? `📊 <b>ارزیابی لایوها</b>\n⭐ میانگین کل: <b>${reviewStats.average.toFixed(2)}/5</b>\n🎥 استریم‌های ارزیابی‌شده: <b>${reviewStats.sessions}</b>\n🧾 تعداد ارزیابی‌ها: <b>${reviewStats.evaluations}</b>\n`
    : "📊 ارزیابی لایو: <b>هنوز ثبت نشده</b>\n";
  const qCount = reviewStats.evaluations;
  const bCount = Array.isArray(stats.bonusHistory) ? stats.bonusHistory.length : 0;
  await telegram(env, "sendMessage", {
    chat_id: chatId,
    text:
      "👤 <b>پروفایل کامل استریمر</b>\n\n" +
      `${formatTelegramProfile(profile, userId)}\n` +
      `🔢 Referral: <b>${escapeHtml(String(referral || "ثبت نشده"))}</b>\n\n` +
      `🏆 رنک: <b>${rank}</b>\n` +
      `⭐ امتیاز فعلی: <b>${Number(stats.points || 0)}</b>\n` +
      `📌 وضعیت: <b>${escapeHtml(String(stats.status || "Active"))}</b>\n` +
      (stats.trialUntil ? `📅 شروع Trial: <b>${stats.trialStartedAt ? new Date(Number(stats.trialStartedAt)).toLocaleDateString("en-GB") : "ثبت نشده"}</b>\n📅 پایان Trial: <b>${trial}</b>\n⏳ مدت Trial: <b>${Number(stats.trialDays || 30)} روز</b>\n` : "") +
      `
🎥 استریم‌های دوره فعلی: <b>${Number(stats.streams || 0)}</b>
` +
      `⏱ تایم دوره فعلی: <b>${formatDuration(totalMinutes)}</b>
` +
      `
📚 <b>آمار کلی از روز اول (بدون تأثیر ریست)</b>
` +
      `🎥 کل استریم‌ها: <b>${Number(lifetimeStreams.streams || 0)}</b>
` +
      `⏱ کل ساعات استریم: <b>${formatDuration(lifetimeStreams.minutes || 0)}</b>
` +
      `💰 حقوق واریزشده از ابتدا:
${formatPaidTotals(lifetimePay)}
` +
      (stats.lastStreamAt ? `🕐 آخرین فعالیت: <b>${new Date(stats.lastStreamAt).toLocaleString("en-GB")}</b>\n` : "") +
      `\n${qualityText}` +
      `\n📚 تعداد ارزیابی‌ها: <b>${qCount}</b>\n` +
      `🎁 تعداد پاداش‌های ثبت‌شده در تاریخچه: <b>${bCount}</b>\n` +
      `🎁 پوینت پاداش فعلی: <b>${Number(stats.bonusPoints || 0)}</b>`,
    parse_mode: "HTML",
    reply_markup: { inline_keyboard: Number(viewerId) === Number(OWNER_ID) ? [
      [{ text: "📚 تاریخچه", callback_data: `team_history:${Number(userId)}` }],
      [{ text: "📊 ارزیابی‌های لایو", callback_data: `streamreview_target_stats:${Number(userId)}` }, { text: "🎁 افزودن پوینت", callback_data: `team_manage_member:bonus:${Number(userId)}` }],
      [{ text: "🏆 رتبه‌بندی", callback_data: "team_leaderboard" }],
      [{ text: "🔙 مدیریت رنک و امتیاز", callback_data: "team_points_manage" }]
    ] : [
      [{ text: "🏆 رتبه‌بندی", callback_data: "team_leaderboard" }],
      [{ text: "🏠 منوی اصلی", callback_data: "home" }]
    ]}
  });
}

async function sendTeamProfileMembers(env, chatId) {
  const users = await getTeamUsers(env);
  const rows = [];
  for (const id of users) {
    const profile = await getTelegramProfile(env, id);
    rows.push([{ text: getPublicUserName(profile, id), callback_data: `team_profile_member:${id}` }]);
  }
  rows.push([{ text: "🔙 داشبورد تیم", callback_data: "team_dashboard" }]);
  await telegram(env, "sendMessage", {
    chat_id: chatId,
    text: users.length ? "👤 <b>پروفایل استریمر</b>\n\nیک نفر را انتخاب کن:" : "❌ عضوی برای نمایش وجود ندارد.",
    parse_mode: "HTML",
    reply_markup: { inline_keyboard: rows }
  });
}

async function sendTeamHistory(env, chatId, userId) {
  const members = await getTeamUsers(env);
  if (!members.includes(Number(userId))) {
    await telegram(env, "sendMessage", { chat_id: chatId, text: "❌ این عضو در تیم نیست." });
    return;
  }
  const profile = await getTelegramProfile(env, userId);
  const stats = await getTeamStats(env, userId);
  const totalMinutes = await getTotalStreamTime(env, userId);
  const lifetimeStreams = await getLifetimeStreamStats(env, userId);
  const lifetimePay = await getLifetimePaidTotals(env, userId);
  const q = Array.isArray(stats.qualityHistory) ? stats.qualityHistory.slice().reverse() : [];
  const b = Array.isArray(stats.bonusHistory) ? stats.bonusHistory.slice().reverse() : [];
  let text = `📚 <b>تاریخچه ${escapeHtml(getPublicUserName(profile, userId))}</b>\n\n`;
  text += `⭐ امتیاز فعلی: <b>${Number(stats.points || 0)}</b>\n`;
  text += `🔄 دوره فعلی: <b>${Number(stats.streams || 0)}</b> استریم | ⏱ ${formatDuration(totalMinutes)}
`;
  text += `📚 کل از ابتدا: <b>${Number(lifetimeStreams.streams || 0)}</b> استریم | ⏱ ${formatDuration(lifetimeStreams.minutes || 0)}
`;
  text += `💰 حقوق کلی واریزشده:
${formatPaidTotals(lifetimePay)}

`;
  text += `🎯 <b>آخرین ارزیابی‌ها</b>\n`;
  if (!q.length) text += "ثبت نشده\n";
  else q.slice(0, 8).forEach((x, i) => {
    const d = new Date(Number(x.at || 0)).toLocaleDateString("en-GB");
    text += `${i + 1}. ${d} — میانگین <b>${Number(x.average || 0).toFixed(2)}/10</b> — +${Number(x.points || 0)} پوینت\n`;
  });
  text += `\n🎁 <b>آخرین پاداش‌ها</b>\n`;
  if (!b.length) text += "ثبت نشده\n";
  else b.slice(0, 8).forEach((x, i) => {
    const d = new Date(Number(x.at || 0)).toLocaleDateString("en-GB");
    text += `${i + 1}. ${d} — +<b>${Number(x.points || 0)}</b> پوینت\n`;
  });
  await telegram(env, "sendMessage", { chat_id: chatId, text, parse_mode: "HTML", reply_markup: { inline_keyboard: [[{ text: "👤 پروفایل", callback_data: `team_profile_member:${Number(userId)}` }], [{ text: "🔙 داشبورد تیم", callback_data: "team_dashboard" }]] } });
}

async function sendTeamAdminLogs(env, chatId) {
  const logs = (await getTeamAdminLogs(env)).slice().reverse();
  let text = "📋 <b>لاگ مدیریتی تیم</b>\n\n";
  if (!logs.length) text += "هنوز فعالیتی ثبت نشده است.";
  else {
    const names = {};
    for (const log of logs.slice(0, 30)) {
      let name = "سیستم";
      if (log.targetId) {
        if (!names[log.targetId]) names[log.targetId] = getPublicUserName(await getTelegramProfile(env, log.targetId), log.targetId);
        name = names[log.targetId];
      }
      const date = new Date(Number(log.at || 0)).toLocaleString("en-GB");
      let action = "فعالیت";
      if (log.action === "quality") action = `🎯 ارزیابی +${Number(log.details?.points || 0)} پوینت`;
      else if (log.action === "bonus") action = `🎁 پاداش +${Number(log.details?.points || 0)} پوینت`;
      else if (log.action === "stream") action = `🎥 ثبت استریم ${formatDuration(Number(log.details?.minutes || 0))}`;
      else if (log.action === "trial_start") action = "🟡 شروع Trial";
      else if (log.action === "trial_stop") action = "🔴 پایان Trial";
      else if (log.action === "quality_history_clear") action = `🗑 پاک‌کردن تاریخچه ارزیابی‌ها (${Number(log.details?.evaluations || 0)} ارزیابی)`;
      else if (log.action === "quality_reset") action = `🎯 ریست نمره‌ها (${Number(log.details?.count || 0)} نفر)`;
      else if (log.action === "period_reset") action = `🔄 ریست دوره (${Number(log.details?.count || 0)} نفر)`;
      else if (log.action === "time_reset") action = `⏱️ ریست تایم (${Number(log.details?.count || 0)} نفر)`;
      else if (log.action === "points_reset") action = `⭐ ریست امتیازها (${Number(log.details?.count || 0)} نفر)`;
      text += `• <b>${escapeHtml(name)}</b> — ${action}\n  🕐 ${date}\n`;
    }
  }
  await telegram(env, "sendMessage", { chat_id: chatId, text, parse_mode: "HTML", reply_markup: { inline_keyboard: [[{ text: "🔄 بروزرسانی", callback_data: "team_admin_logs" }], [{ text: "🔙 داشبورد تیم", callback_data: "team_dashboard" }]] } });
}

async function getStreamReviewStatsForTargets(env, targetIds) {
  const result = new Map();
  for (const id of targetIds) {
    result.set(Number(id), {
      sessions: 0,
      evaluations: 0,
      criteria: STREAM_REVIEW_ITEMS.map(() => ({ sum: 0, count: 0 })),
      average: 0,
      _overallSum: 0,
      _overallCount: 0
    });
  }
  if (!env.BOT_STATE || !targetIds.length) return result;

  let cursor;
  do {
    const options = { prefix: "streamreview:session:", limit: 1000 };
    if (cursor) options.cursor = cursor;
    const page = await env.BOT_STATE.list(options);
    const sessions = await Promise.all((page.keys || []).map((key) => env.BOT_STATE.get(key.name, "json")));

    for (const session of sessions) {
      if (!session) continue;
      const targetId = Number(session.targetId);
      const stats = result.get(targetId);
      if (!stats) continue;

      const evaluations = Object.values(session.evaluations || {});
      if (evaluations.length) stats.sessions++;
      stats.evaluations += evaluations.length;

      for (const evaluation of evaluations) {
        (Array.isArray(evaluation.scores) ? evaluation.scores : []).forEach((score, index) => {
          const value = Number(score);
          const criterion = stats.criteria[index];
          if (Number.isFinite(value) && criterion) {
            criterion.sum += value;
            criterion.count++;
            stats._overallSum += value;
            stats._overallCount++;
          }
        });
      }
    }
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);

  for (const stats of result.values()) {
    stats.criteria = stats.criteria.map((item) => ({
      average: item.count > 0 ? item.sum / item.count : 0,
      count: item.count
    }));
    stats.average = stats._overallCount > 0 ? stats._overallSum / stats._overallCount : 0;
    delete stats._overallSum;
    delete stats._overallCount;
  }
  return result;
}

async function sendTeamLeaderboard(env, chatId) {
  const users = await getTeamUsers(env);
  const reviewStatsByTarget = await getStreamReviewStatsForTargets(env, users);

  const rows = await Promise.all(users.map(async (id) => {
    const [stats, profile, minutes, lifetimeStreams] = await Promise.all([
      getTeamStats(env, id),
      getTelegramProfile(env, id),
      getTotalStreamTime(env, id),
      getLifetimeStreamStats(env, id)
    ]);
    const reviewStats = reviewStatsByTarget.get(Number(id));
    return {
      id,
      points: Number(stats.points || 0),
      minutes: Number(minutes || 0),
      streams: Number(stats.streams || 0),
      lifetimeMinutes: Number(lifetimeStreams.minutes || 0),
      lifetimeStreams: Number(lifetimeStreams.streams || 0),
      status: String(stats.status || "Active"),
      trialUntil: Number(stats.trialUntil || 0),
      quality: reviewStats && reviewStats.evaluations ? Number(reviewStats.average) : null,
      name: getPublicUserName(profile, id)
    };
  }));

  rows.sort((a, b) => b.points - a.points || b.minutes - a.minutes || b.streams - a.streams);
  const medals = ["🥇", "🥈", "🥉"];
  let text = "🏆 <b>رتبه‌بندی کامل تیم استریمرها</b>\n";
  text += `👥 تعداد اعضا: <b>${rows.length}</b>\nترتیب بر اساس امتیاز فعال، سپس تایم استریم است.\n\n`;
  if (!rows.length) text += "هنوز اطلاعاتی برای رتبه‌بندی ثبت نشده است.";
  rows.slice(0, 20).forEach((r, i) => {
    const place = medals[i] || `${i + 1}.`;
    const qualityText = r.quality === null ? "ثبت نشده" : `${r.quality.toFixed(2)}/5`;
    const statusText = r.status === "Trial" ? `🧪 Trial${r.trialUntil > Date.now() ? ` تا ${new Date(r.trialUntil).toLocaleDateString("en-GB")}` : ""}` : r.status === "Inactive" ? "🔴 غیرفعال" : "🟢 فعال";
    text += `${place} <b>${escapeHtml(r.name)}</b>\n`;
    text += `   🏆 ${escapeHtml(teamRank(r.points))} | ⭐ <b>${r.points}</b> امتیاز\n`;
    text += `   📚 کل از ابتدا: 🎥 ${r.lifetimeStreams} استریم | ⏱ ${formatDuration(r.lifetimeMinutes)}\n`;
    text += `   🔄 دوره فعلی: 🎥 ${r.streams} استریم | ⏱ ${formatDuration(r.minutes)}\n`;
    text += `   📊 ارزیابی لایو: ${qualityText} | ${statusText}\n\n`;
  });
  if (rows.length > 20) text += `\nنمایش ۲۰ نفر اول از ${rows.length} عضو.`;

  const [allTimePaidTotals, companyDonationRaw] = await Promise.all([
    getAllTimePaidTotals(env),
    env.BOT_STATE.get("team:company_donations_total")
  ]);
  const allLifetimeStreams = rows.reduce((sum, row) => sum + Number(row.lifetimeStreams || 0), 0);
  const allLifetimeMinutes = rows.reduce((sum, row) => sum + Number(row.lifetimeMinutes || 0), 0);
  const companyDonationTotal = Math.max(0, Number(companyDonationRaw || 0));

  text += `\n\n📊 <b>آمار کلی استریم از ابتدا · همه اعضا</b>
🎥 مجموع استریم‌ها: <b>${allLifetimeStreams.toLocaleString("en-US")}</b>
⏱️ مجموع زمان استریم: <b>${formatDuration(allLifetimeMinutes)}</b>
🎁 مجموع دونیت از سمت مجموعه: <b>${companyDonationTotal.toLocaleString("en-US")}</b>

💰 <b>آمار کلی حقوق پرداخت‌شده از ابتدا</b>
${formatPaidTotals(allTimePaidTotals)}`;
  // Ranking is intentionally a clean report without the "My Profile" or other buttons.
  await telegram(env, "sendMessage", { chat_id: chatId, text, parse_mode: "HTML", disable_web_page_preview: true });
}
async function getUnifiedManagedMemberIds(env) {
  const [teamUsers, streamUsers, supportUsers, announceUsers, profileUsers] = await Promise.all([
    getTeamUsers(env), getStreamTimeMembers(env), getSupportAdmins(env),
    getStreamAnnouncementAllowedUsers(env), getProfileAllowedUsers(env)
  ]);
  return [...new Set([...teamUsers, ...streamUsers, ...supportUsers, ...announceUsers, ...profileUsers]
    .map(Number).filter(id => id > 0 && id !== Number(OWNER_ID)))];
}

async function sendTeamMembersHub(env, chatId) {
  const ids = await getUnifiedManagedMemberIds(env);
  if (!ids.length) {
    await telegram(env, "sendMessage", { chat_id: chatId, text: "👥 هنوز عضوی برای مدیریت ثبت نشده است.", reply_markup: { inline_keyboard: [[{ text: "➕ افزودن عضو", callback_data: "streamtime_add" }, { text: "➖ حذف عضو", callback_data: "streamtime_remove" }], [{ text: "🔙 داشبورد مدیریت", callback_data: "team_dashboard" }]] } });
    return;
  }
  const rows = [[{ text: "➕ افزودن عضو", callback_data: "streamtime_add" }, { text: "➖ حذف عضو", callback_data: "streamtime_remove" }]];
  for (const id of ids.slice(0, 100)) {
    const profile = await getTelegramProfile(env, id);
    const stats = await getTeamStats(env, id);
    const perms = await getUnifiedUserPermissions(env, id);
    const flags = `${perms.support ? "🛡️" : "▫️"}${perms.streamtime ? "⏰" : "▫️"}${perms.announce ? "📣" : "▫️"}`;
    rows.push([{ text: `${flags} ${getPublicUserName(profile, id)} · ${id}`, callback_data: `team_member_card:${id}` }]);
  }
  rows.push([{ text: "🔄 بروزرسانی", callback_data: "team_members_hub" }]);
  rows.push([{ text: "🔙 داشبورد مدیریت", callback_data: "team_dashboard" }]);
  await telegram(env, "sendMessage", { chat_id: chatId,
    text: `👥 <b>مدیریت یکپارچه اعضا</b>\n\nتعداد افراد: <b>${ids.length}</b>\nروی یک نفر بزن تا دسترسی، Trial، Referral، آمار، تایم، پرداخت و تاریخچه همان شخص را مدیریت کنی.`,
    parse_mode: "HTML", reply_markup: { inline_keyboard: rows } });
}

async function sendTeamMemberCard(env, chatId, userId) {
  const id = Number(userId);
  const ids = await getUnifiedManagedMemberIds(env);
  if (!id || !ids.includes(id)) {
    await telegram(env, "sendMessage", { chat_id: chatId, text: "❌ این عضو در فهرست مدیریت پیدا نشد.", reply_markup: { inline_keyboard: [[{ text: "🔙 لیست اعضا", callback_data: "team_members_hub" }]] } });
    return;
  }
  const profile = await getTelegramProfile(env, id);
  const stats = await getTeamStats(env, id);
  const perms = await getUnifiedUserPermissions(env, id);
  const referral = await getUserReferral(env, id);
  const minutes = Number(await getTotalStreamTime(env, id) || 0);
  const lifetimeStreams = await getLifetimeStreamStats(env, id);
  const lifetimePay = await getLifetimePaidTotals(env, id);
  const payment = env.BOT_STATE ? await env.BOT_STATE.get(`team:payment:${id}`, "json") : null;
  const paid = Boolean(payment && payment.week === getPaymentWeekKey() && payment.choice);
  const until = Number(stats.trialUntil || 0);
  const trialText = stats.status === "Trial" && until > Date.now()
    ? `${Math.max(0, Math.ceil((until - Date.now()) / 86400000))} روز باقی‌مانده`
    : (stats.status === "Trial" ? "پایان‌یافته" : "فعال نیست");
  const text = `👤 <b>مدیریت عضو</b>\n\n🎮 اسم گیم: <b>${escapeHtml(await getTeamGameName(env, id) || getPublicUserName(profile, id))}</b>\n🆔 آیدی تلگرام: <code>${id}</code>\n\n${formatTelegramProfile(profile, id)}\n\n` +
    `🛡️ Support: ${perms.support ? "✅" : "❌"}\n` +
    `⏰ StreamTime: ${perms.streamtime ? "✅" : "❌"}\n` +
    `👤 Profile: ${perms.profile ? "✅" : "❌"}\n` +
    `📣 Announce: ${perms.announce ? "✅" : "❌"}\n\n` +
    `🧪 Trial: <b>${escapeHtml(trialText)}</b>\n` +
    `🎫 Referral: <b>${escapeHtml(String(referral || "ثبت نشده"))}</b>\n` +
    `⭐ Points: <b>${Number(stats.points || 0)}</b> · 🏆 ${escapeHtml(teamRank(stats.points))}\n` +
    `📊 استریم‌های دوره فعلی: <b>${Number(stats.streams || 0)}</b>
` +
    `⏱️ تایم دوره فعلی: <b>${formatDuration(minutes)}</b>
` +
    `📚 کل استریم از ابتدا: <b>${Number(lifetimeStreams.streams || 0)}</b>
` +
    `⏱️ کل تایم از ابتدا: <b>${formatDuration(lifetimeStreams.minutes || 0)}</b>
` +
    `💰 حقوق کلی واریزشده:
${formatPaidTotals(lifetimePay)}
` +
    `💰 انتخاب حقوق این هفته: <b>${paid ? "ثبت شده" : "ثبت نشده"}</b>`;
  await telegram(env, "sendMessage", { chat_id: chatId, text, parse_mode: "HTML", reply_markup: { inline_keyboard: [
    [{ text: "🔐 دسترسی‌ها", callback_data: `team_member_section:access:${id}` }, { text: "🧪 Trial", callback_data: `team_member_section:trial:${id}` }],
    [{ text: "🎫 Referral", callback_data: `team_member_section:referral:${id}` }, { text: "📊 آمار و امتیاز", callback_data: `team_member_section:stats:${id}` }],
    [{ text: "🎮 ثبت / تغییر اسم گیم", callback_data: `team_member_game_name:${id}` }],
    [{ text: "⏱️ تایم استریم", callback_data: `team_member_section:time:${id}` }, { text: "💰 پرداخت", callback_data: `team_member_section:payment:${id}` }],
    [{ text: "📋 گزارش فعالیت", callback_data: `team_history:${id}` }],
    [{ text: "🔙 لیست اعضا", callback_data: "team_members_hub" }]
  ] } });
}

async function sendTeamMemberSection(env, chatId, section, userId) {
  const id = Number(userId);
  const profile = await getTelegramProfile(env, id);
  const stats = await getTeamStats(env, id);
  const name = escapeHtml(getPublicUserName(profile, id));
  let title = "";
  let rows = [];
  if (section === "access") {
    const p = await getUnifiedUserPermissions(env, id);
    title = `🔐 <b>دسترسی‌های ${name}</b>\n\n🛡️ Support: ${p.support ? "✅ فعال" : "❌ غیرفعال"}\n⏰ StreamTime: ${p.streamtime ? "✅ فعال" : "❌ غیرفعال"}\n👤 Profile: ${p.profile ? "✅ فعال" : "❌ غیرفعال"}\n📣 Announce: ${p.announce ? "✅ فعال" : "❌ غیرفعال"}`;
    const supportAdmin = await isSupportAdmin(env, id);
    rows = [
      [{ text: `${p.support ? "❌ گرفتن" : "✅ دادن"} Support`, callback_data: `team_member_toggle:support:${id}` }],
      ...(supportAdmin ? [] : [[{ text: `${p.streamtime ? "❌ گرفتن" : "✅ دادن"} StreamTime`, callback_data: `team_member_toggle:streamtime:${id}` }]]),
      [{ text: `${p.profile ? "❌ گرفتن" : "✅ دادن"} Profile`, callback_data: `team_member_toggle:profile:${id}` }],
      ...(supportAdmin ? [] : [[{ text: `${p.announce ? "❌ گرفتن" : "✅ دادن"} Announce`, callback_data: `team_member_toggle:announce:${id}` }]])
    ];
    if (supportAdmin) title += "\n\nℹ️ دسترسی StreamTime و Announce برای ادمین Support به‌صورت خودکار فعال است.";
  } else if (section === "trial") {
    const until = Number(stats.trialUntil || 0);
    const active = stats.status === "Trial" && until > Date.now();
    title = `🧪 <b>مدیریت Trial · ${name}</b>\n\nوضعیت: <b>${active ? `فعال تا ${new Date(until).toLocaleDateString("en-GB")}` : "فعال نیست"}</b>${active ? `\nشروع: <b>${stats.trialStartedAt ? new Date(Number(stats.trialStartedAt)).toLocaleDateString("en-GB") : "ثبت نشده"}</b>\nمدت: <b>${Number(stats.trialDays || 30)} روز</b>` : ""}`;
    rows = [[{ text: "🟡 شروع / تغییر مدت Trial", callback_data: `team_member_trial_start:${id}` }], [{ text: "🔴 پایان Trial", callback_data: `team_member_trial_stop:${id}` }]];
  } else if (section === "referral") {
    title = `🎫 <b>Referral · ${name}</b>\n\nمقدار فعلی: <b>${escapeHtml(String(await getUserReferral(env, id) || "ثبت نشده"))}</b>\n\nبرای ثبت یا تغییر Referral، دکمه زیر را بزن و مقدار جدید را ارسال کن.`;
    rows = [[{ text: "✏️ ثبت / تغییر Referral", callback_data: `team_member_referral:${id}` }]];
  } else if (section === "stats") {
    const reviewStats = await getStreamReviewTargetStats(env, id);
    title = `📊 <b>آمار و امتیاز · ${name}</b>

⭐ پوینت: <b>${Number(stats.points || 0)}</b>
🏆 رنک: <b>${escapeHtml(teamRank(stats.points))}</b>
🎥 تعداد استریم: <b>${Number(stats.streams || 0)}</b>
📊 میانگین ارزیابی لایو: <b>${reviewStats.evaluations ? reviewStats.average.toFixed(2) + "/5" : "ثبت نشده"}</b>
🧾 تعداد ارزیابی‌ها: <b>${reviewStats.evaluations}</b>`;
    rows = [[{ text: "📊 ارزیابی‌های لایو", callback_data: `streamreview_target_stats:${id}` }, { text: "🎁 افزودن پوینت", callback_data: `team_manage_member:bonus:${id}` }]];
  } else if (section === "time") {
    title = `⏱️ <b>تایم استریم · ${name}</b>\n\n🎥 تعداد استریم: <b>${Number(stats.streams || 0)}</b>\n⌛ مجموع تایم: <b>${formatDuration(await getTotalStreamTime(env, id))}</b>\n\nمدت زمان را برای ثبت یا حذف وارد کن.`;
    rows = [[{ text: "➕ ثبت تایم / استریم", callback_data: `team_member_time:add:${id}` }], [{ text: "➖ حذف تایم / استریم", callback_data: `team_member_time:remove:${id}` }]];
  } else if (section === "payment") {
    const payment = env.BOT_STATE ? await env.BOT_STATE.get(`team:payment:${id}`, "json") : null;
    const paid = Boolean(payment && payment.week === getPaymentWeekKey() && payment.choice);
    title = `💰 <b>حقوق این هفته · ${name}</b>\n\nوضعیت: <b>${paid ? "انتخاب ثبت شده و پرداخت محسوب می‌شود" : "هنوز انتخاب نشده"}</b>${paid ? `\nنوع: <b>${escapeHtml(String(payment.choice || "-"))}</b>\nمبلغ: <b>${Number(payment.amount || 0).toLocaleString("en-US")}</b>` : ""}\n\nاز این بخش می‌توانی حقوق را ویرایش یا حذف کنی:`;
    rows = [[{ text: "🧾 ثبت / اصلاح حقوق هفتگی", callback_data: `weekly_payment_member:${id}` }], ...(paid ? [[{ text: "✏️ ویرایش حقوق ثبت‌شده", callback_data: `salary_edit:${id}:${payment.week}` }, { text: "🗑 حذف حقوق ثبت‌شده", callback_data: `salary_delete:${id}:${payment.week}` }]] : []), [{ text: "➕ افزودن حقوق قبلی", callback_data: `legacy_salary_member:${id}` }], [{ text: "💰 فهرست حقوق این هفته", callback_data: "payment_list" }]];
  } else {
    await sendTeamMemberCard(env, chatId, id);
    return;
  }
  rows.push([{ text: "🔙 بازگشت به پرونده عضو", callback_data: `team_member_card:${id}` }]);
  await telegram(env, "sendMessage", { chat_id: chatId, text: title, parse_mode: "HTML", reply_markup: { inline_keyboard: rows } });
}

async function sendTeamDashboard(env, chatId) {
  const users = await getTeamUsers(env);
  let active = 0, trial = 0, inactive = 0, totalStreams = 0, totalPoints = 0;
  let top = null;
  for (const id of users) {
    const stats = await getTeamStats(env, id);
    const status = String(stats.status || "Active");
    if (status === "Trial") trial++; else if (status === "Inactive") inactive++; else active++;
    totalStreams += Number(stats.streams || 0);
    totalPoints += Number(stats.points || 0);
    if (!top || Number(stats.points || 0) > top.points) top = { id, points: Number(stats.points || 0) };
  }
  let topName = "-";
  if (top) topName = getPublicUserName(await getTelegramProfile(env, top.id), top.id);
  const groups = await getStreamTimeGroups(env);
  const announceChats = await getStreamAnnounceChats(env);
  const supportAdmins = await getSupportAdmins(env);
  const forumChatId = await getSupportForumChatId(env);
  const rows = [
    [{ text: "➕ افزودن عضو", callback_data: "streamtime_add" }, { text: "➖ حذف عضو", callback_data: "streamtime_remove" }],
    [{ text: "👥 مدیریت یکپارچه اعضا", callback_data: "team_members_hub" }, { text: "📋 لیست اعضا", callback_data: "streamtime_list" }],
    [{ text: "⏱️ تایم یک عضو", callback_data: "streamtime_total" }, { text: "🕐 مدیریت تایم اعضا", callback_data: "streamtime_time_manage" }],
    [{ text: "➕ ثبت دستی استریم", callback_data: "manual_stream_add" }, { text: "➖ حذف استریم", callback_data: "manual_stream_remove" }],
    [{ text: "🟡 شروع / تنظیم Trial", callback_data: "trial_start" }, { text: "🔴 پایان Trial", callback_data: "trial_stop" }],
    [{ text: "🎫 ثبت / تغییر Referral", callback_data: "streamtime_referral" }],
    [{ text: `📨 ارسال متن به گروه (${groups.length} گروه)`, callback_data: "streamtime_group_text" }],
    [{ text: "➕ افزودن گروه", callback_data: "streamtime_group_add" }, { text: "➖ حذف گروه", callback_data: "streamtime_group_remove" }],
    [{ text: "📋 لیست گروه‌ها", callback_data: "streamtime_group_list" }, { text: "🧪 تست ارسال گروه", callback_data: "streamtime_group_test" }],
    [{ text: `🔐 دسترسی اعلام استریم (${announceChats.length} مقصد)`, callback_data: "streamannounce_access_manage" }],
    [{ text: "➕ افزودن مقصد اعلام", callback_data: "streamannounce_add" }, { text: "➖ حذف مقصد اعلام", callback_data: "streamannounce_remove" }],
    [{ text: "📋 لیست مقصدها", callback_data: "streamannounce_list" }, { text: "🧪 تست مقصد اعلام", callback_data: "streamannounce_test" }],
    [{ text: "🧩 تنظیم قالب اعلام هر عضو", callback_data: "streamannounce_templates" }],
    [{ text: "💰 حقوق این هفته / اصلاح و حذف", callback_data: "payment_list" }],
    [{ text: "🧾 ثبت حقوق هفتگی", callback_data: "streamtime_weekly_payment" }],
    [{ text: "➕ افزودن حقوق قبلی به آمار", callback_data: "legacy_salary_add" }],
    [{ text: "🎁 ثبت دونیت از سمت مجموعه", callback_data: "team_company_donation_add" }, { text: "📒 دفترچه دونیت", callback_data: "team_company_donation_ledger" }],
    [{ text: "👥 مدیریت ارزیاب‌ها", callback_data: "quality_admin_list" }, { text: "➕ افزودن ارزیاب", callback_data: "quality_admin_add" }],
    [{ text: "📋 آمار ارزیاب‌ها", callback_data: "sr_reviewers:0" }, { text: "📊 نتیجه ارزیابی لایو", callback_data: "team_streamreview_results" }],
    [{ text: "🔄 ریست نمره و پوینت ارزیابی", callback_data: "team_quality_reset_confirm" }],
    [{ text: "⚙️ تنظیم گروه ارزیابی", callback_data: "streamreview_setup_help" }],
    [{ text: "🎁 افزودن پوینت / پاداش", callback_data: "team_bonus_members" }, { text: "🏅 لیست رنک‌ها", callback_data: "team_rank_list" }],
    [{ text: "⏱️ ریست تایم و استریم‌ها", callback_data: "team_reset_confirm" }, { text: "⭐ ریست امتیازها", callback_data: "team_points_reset_confirm" }],
    [{ text: "👤 اصلاح / ریست عضو", callback_data: "team_individual_picker" }, { text: "🏆 رتبه‌بندی تیم", callback_data: "team_leaderboard" }],
    [{ text: "📈 گزارش StreamTime اعضا", callback_data: "streamtime_member_stats" }, { text: "📨 ارسال گزارش به گروه", callback_data: "streamtime_member_stats_send_group" }],
    [{ text: "👥 تعداد کاربران ربات", callback_data: "streamtime_users_count" }, { text: "📋 لاگ مدیریتی", callback_data: "team_admin_logs" }],
    [{ text: `➕ افزودن ادمین Support (${supportAdmins.length} ادمین)`, callback_data: "support_admin_add" }],
    [{ text: "➖ حذف ادمین Support", callback_data: "support_admin_remove" }, { text: "📋 لیست ادمین‌های Support", callback_data: "support_admin_list" }],
    [{ text: `⚙️ تنظیم / تغییر چت Support ${forumChatId ? "(فعال)" : "(تنظیم‌نشده)"}`, callback_data: "support_forum_set" }],
    [{ text: "⛔ غیرفعال کردن Topics", callback_data: "support_forum_disable" }, { text: "✅ فعال کردن Topics", callback_data: "support_forum_enable" }],
    [{ text: "📣 پیام همگانی", callback_data: "broadcast_all" }],
    [{ text: "👤 مشاهده پرونده اعضا", callback_data: "team_profile_members" }],
    [{ text: "🔄 بروزرسانی داشبورد", callback_data: "team_dashboard" }, { text: "🏠 منوی اصلی", callback_data: "home" }]
  ];
  await telegram(env, "sendMessage", {
    chat_id: chatId,
    text:
      "👑 <b>مدیریت تیم و اعضا — پنل یکپارچه</b>\n\n" +
      `👥 اعضا: <b>${users.length}</b> | 🟢 فعال: <b>${active}</b> | 🟡 Trial: <b>${trial}</b> | 🔴 غیرفعال: <b>${inactive}</b>\n` +
      `🎥 کل استریم‌ها: <b>${totalStreams}</b> | ⭐ مجموع امتیاز: <b>${totalPoints}</b>\n` +
      `🏆 بالاترین امتیاز: <b>${escapeHtml(topName)}</b>\n\n` +
      "همه ابزارهای مدیریتی در همین پنل جمع شده‌اند؛ منوهای جداگانه قدیمی حذف شده‌اند.",
    parse_mode: "HTML",
    reply_markup: { inline_keyboard: rows }
  });
}

async function handleTeamProfileAndButtons(env, message) {
  const text = message.text ? message.text.trim() : "";
  if (text === "👤 پروفایل من") {
    if (Number(message.from.id) !== Number(OWNER_ID) && !(await isAllowedProfile(env, message.from.id))) {
      await telegram(env, "sendMessage", { chat_id: message.chat.id, text: "❌ شما دسترسی پروفایل ندارید." });
      return true;
    }
    await sendTeamProfile(env, message.chat.id, message.from.id);
    return true;
  }
  if (text === "🏆 رتبه‌بندی") {
    await sendTeamLeaderboard(env, message.chat.id);
    return true;
  }
  if ((text === "👑 مدیریت تیم و اعضا" || text === "👑 داشبورد تیم" || text === "👥 مدیریت اعضای StreamTime") && Number(message.from.id) === Number(OWNER_ID)) { await sendTeamDashboard(env, message.chat.id); return true; }
  return false;
}
async function handleEnhancedMessage(env, message) {
  const userId = Number(message.from.id);
  if (userId === Number(OWNER_ID) && env.BOT_STATE) {
    const streamAdjustState = await env.BOT_STATE.get(`team:stream_count_adjust_state:${message.chat.id}`, "json");
    if (streamAdjustState) {
      const raw = String(message.text || "").trim();
      const amount = Number(raw);
      if (!/^\d+$/.test(raw) || !Number.isSafeInteger(amount) || amount < 1 || amount > 1000000) {
        await telegram(env, "sendMessage", { chat_id: message.chat.id, text: "❌ یک عدد صحیح بین 1 تا 1000000 بفرست. برای لغو، دکمه لغو را بزن." });
        return true;
      }
      await env.BOT_STATE.delete(`team:stream_count_adjust_state:${message.chat.id}`);
      await adjustIndividualStreamCount(env, message.chat.id, streamAdjustState.action, streamAdjustState.targetId, amount);
      return true;
    }
    const donationEditState = await env.BOT_STATE.get(`team:company_donation_edit_state:${message.chat.id}`, "json");
    if (donationEditState) {
      const raw = String(message.text || "").trim();
      const amount = Number(raw);
      if (!/^\d+$/.test(raw) || !Number.isSafeInteger(amount) || amount < 1 || amount > 1000000000000) {
        await telegram(env, "sendMessage", { chat_id: message.chat.id, text: "❌ مبلغ باید عدد صحیح مثبت باشد؛ مثلاً 100 یا 250000. برای لغو، دکمه لغو را بزن." });
        return true;
      }
      await env.BOT_STATE.delete(`team:company_donation_edit_state:${message.chat.id}`);
      await editCompanyDonation(env, message.chat.id, donationEditState.entryId, amount);
      return true;
    }
    const donationState = await env.BOT_STATE.get(`team:company_donation_state:${message.chat.id}`, "json");
    if (donationState) {
      const raw = String(message.text || "").trim();
      const amount = Number(raw);
      if (!/^\d+$/.test(raw) || !Number.isSafeInteger(amount) || amount < 1 || amount > 1000000000000) {
        await telegram(env, "sendMessage", { chat_id: message.chat.id, text: "❌ مبلغ باید عدد صحیح مثبت باشد؛ مثلاً 100 یا 250000." });
        return true;
      }
      await env.BOT_STATE.delete(`team:company_donation_state:${message.chat.id}`);
      await addCompanyDonation(env, message.chat.id, amount);
      return true;
    }
    const trialState = await env.BOT_STATE.get(`team:trial_duration_state:${message.chat.id}`, "json");
    if (trialState) {
      const rawDays = String(message.text || "").trim();
      const days = Number(rawDays);
      if (!/^\d+$/.test(rawDays) || !Number.isInteger(days) || days < 1 || days > 3650) {
        await telegram(env, "sendMessage", { chat_id: message.chat.id, text: "❌ تعداد روز معتبر نیست. یک عدد صحیح بین ۱ تا ۳۶۵۰ بفرست؛ مثلاً 14 یا 45." });
        return true;
      }
      const groups = await getStreamTimeGroups(env);
      if (!groups.length) {
        await telegram(env, "sendMessage", { chat_id: message.chat.id, text: "❌ هنوز گروهی برای پیام Trial ثبت نشده است. ابتدا از «مدیریت گروه‌ها و مقصدها» یک گروه StreamTime اضافه کن؛ سپس Trial را ثبت کن." });
        return true;
      }
      trialState.days = days;
      await env.BOT_STATE.put(`team:trial_duration_state:${message.chat.id}`, JSON.stringify(trialState), { expirationTtl: 900 });
      const rows = groups.map(group => [{ text: `📣 ${group.title || group.chatId}`, callback_data: `trial_group_select:${group.chatId}` }]);
      rows.push([{ text: "❌ لغو", callback_data: "trial_duration_cancel" }]);
      const profile = await getTelegramProfile(env, trialState.targetId);
      await telegram(env, "sendMessage", { chat_id: message.chat.id, text: `📣 <b>انتخاب گروه اطلاع‌رسانی Trial</b>\n\n👤 عضو: <b>${escapeHtml(getPublicUserName(profile, trialState.targetId))}</b>\n⏳ مدت Trial: <b>${days} روز</b>\n\nپیام شروع Trial در کدام گروه ارسال شود؟`, parse_mode: "HTML", reply_markup: { inline_keyboard: rows } });
      return true;
    }
    const bonus = await env.BOT_STATE.get(`team:bonus_state:${message.chat.id}`, "json");
    if (bonus) {
      const value = Number(String(message.text || "").trim());
      if (!Number.isInteger(value) || value <= 0 || value > 100000) {
        await telegram(env, "sendMessage", { chat_id: message.chat.id, text: "❌ یک عدد صحیح بین 1 تا 100000 بفرست." });
        return true;
      }
      await finishTeamBonus(env, message.chat.id, bonus.targetId, value);
      return true;
    }
  }
  if (await handleTeamProfileAndButtons(env, message)) return true;
  return false;
}
async function handleEnhancedCallback(env, callback) {
  const data = callback.data || "";
  const userId = Number(callback.from.id);
  const chatId = callback.message.chat.id;
  if (data.startsWith("sr_") || data.startsWith("streamreview_target_stats:")) return await handleStreamReviewCallback(env, callback);
  if (data === "streamreview_setup_help") {
    if (userId !== Number(OWNER_ID)) {
      await telegram(env, "answerCallbackQuery", { callback_query_id: callback.id, text: "❌ فقط مدیر اصلی می‌تواند تنظیمات را ببیند.", show_alert: true });
      return true;
    }
    await telegram(env, "sendMessage", { chat_id: chatId, text: "⚙️ <b>تنظیم گروه ارزیابی لایو</b>\n\n۱. بات را به گروهی که می‌خواهی ارزیابی‌ها در آن منتشر شوند اضافه کن.\n۲. داخل همان گروه، با اکانت مدیر اصلی این دستور را بفرست:\n<code>/setstreamreviewgroup</code>\n۳. بات باید اجازه ارسال پیام و عکس داشته باشد. برای بررسی دقیق عضویت افراد، بهتر است بات را ادمین گروه کنی.\n\nبعد از این تنظیم، هر بار که عضو از گزینه فعلی «اعلام لایو» استفاده کند، پیام ارزیابی همان استریم در این گروه ارسال می‌شود. همه اعضای گروه می‌توانند ارزیابی بدهند؛ افزودن دستی افراد لازم نیست.", parse_mode: "HTML", reply_markup: { inline_keyboard: [[{ text: "📋 آمار ارزیاب‌ها", callback_data: "sr_reviewers:0" }], [{ text: "🔙 داشبورد مدیریت", callback_data: "team_dashboard" }]] } });
    await telegram(env, "answerCallbackQuery", { callback_query_id: callback.id });
    return true;
  }
  if (data === "team_streamreview_results") {
    if (userId !== Number(OWNER_ID)) {
      await telegram(env, "answerCallbackQuery", { callback_query_id: callback.id, text: "❌ فقط مدیر اصلی می‌تواند نتیجه ارزیابی‌ها را ببیند.", show_alert: true });
      return true;
    }
    await sendStreamReviewSessionList(env, chatId);
    await telegram(env, "answerCallbackQuery", { callback_query_id: callback.id });
    return true;
  }
  if (data === "team_quality_members") {
    if (userId !== Number(OWNER_ID)) {
      await telegram(env, "answerCallbackQuery", { callback_query_id: callback.id, text: "❌ فقط مدیر اصلی می‌تواند این فهرست مدیریتی را باز کند.", show_alert: true });
      return true;
    }
    await sendStreamReviewReviewerList(env, chatId, 0);
    await telegram(env, "answerCallbackQuery", { callback_query_id: callback.id });
    return true;
  }
  if (data === "quality_admin_add") {
    if (userId !== Number(OWNER_ID)) { await telegram(env, "answerCallbackQuery", { callback_query_id: callback.id, text: "❌ فقط مدیر اصلی می‌تواند ارزیاب اضافه کند.", show_alert: true }); return true; }
    await saveAdminState(env, userId, { action: "quality_evaluator_add", step: 1, data: {} });
    await telegram(env, "sendMessage", { chat_id: chatId, text: "➕ <b>افزودن ارزیاب محدود</b>\n\nمرحله ۱ از ۳\n🎮 اسم داخل بازی این شخص را وارد کن:", parse_mode: "HTML" });
    await telegram(env, "answerCallbackQuery", { callback_query_id: callback.id });
    return true;
  }
  if (data === "quality_admin_remove") {
    if (userId !== Number(OWNER_ID)) { await telegram(env, "answerCallbackQuery", { callback_query_id: callback.id, text: "❌ فقط مدیر اصلی می‌تواند ارزیاب حذف کند.", show_alert: true }); return true; }
    await saveAdminState(env, userId, { action: "quality_admin_remove_wait_id", step: 1, data: {} });
    await telegram(env, "sendMessage", { chat_id: chatId, text: "🆔 آیدی عددی تلگرام ارزیابی که می‌خواهی دسترسی‌اش حذف شود را بفرست." });
    await telegram(env, "answerCallbackQuery", { callback_query_id: callback.id });
    return true;
  }
  if (data.startsWith("team_manage_member:quality:") || data.startsWith("team_quality_score:") || data.startsWith("team_quality_reset_") || data.startsWith("team_quality_history_clear_") || data.startsWith("team_individual_confirm:quality:") || data.startsWith("team_individual_confirm:history:") || data.startsWith("team_individual_do:quality:") || data.startsWith("team_individual_do:history:")) {
    await telegram(env, "answerCallbackQuery", { callback_query_id: callback.id, text: "سیستم ارزیابی قبلی جایگزین شده؛ ارزیابی فقط زیر پیام اعلام لایو انجام می‌شود.", show_alert: true });
    return true;
  }
  const streamTimeCategory = data.match(/^streamtime_menu_(members|groups|payments|reports|support)$/);
  if (streamTimeCategory) {
    if (userId !== Number(OWNER_ID)) {
      await telegram(env, "answerCallbackQuery", { callback_query_id: callback.id, text: "❌ شما دسترسی ندارید.", show_alert: true });
      return true;
    }
    await sendTeamDashboard(env, chatId);
    await telegram(env, "answerCallbackQuery", { callback_query_id: callback.id });
    return true;
  }
  const ownerOnly = data.startsWith("salary_paid:") || data.startsWith("salary_group_select:") || data.startsWith("payment_member:") || data.startsWith("weekly_payment_member:") || data === "streamtime_payment" || data === "trial_duration_cancel" || data.startsWith("trial_group_select:") || data.startsWith("streamtime_remove_pick:") || data.startsWith("streamtime_remove_confirm:") || data === "team_members_hub" || data.startsWith("team_member_card:") || data.startsWith("team_member_section:") || data.startsWith("team_member_toggle:") || data.startsWith("team_member_trial_start:") || data.startsWith("team_member_trial_stop:") || data.startsWith("team_member_referral:") || data.startsWith("team_member_game_name:") || data.startsWith("team_member_time:") || (data.startsWith("team_manage_member:") && !data.startsWith("team_manage_member:quality:")) || data.startsWith("salary_delete:") || data.startsWith("salary_edit:") || data.startsWith("legacy_salary_") || data === "streamannounce_templates" || data.startsWith("streamannounce_template_member:") || data.startsWith("streamannounce_template_set:") || data.startsWith("streamannounce_template_delete:") || data === "quality_admin_add" || data === "quality_admin_remove" || data === "quality_admin_list" || data === "streamtime_manage" || data === "team_dashboard" || data === "team_points_manage" || data === "team_bonus_members" || data.startsWith("team_company_donation_") || data.startsWith("team_input_cancel:") || data === "team_rank_list" || data === "team_reset_confirm" || data === "team_reset_do" || data === "team_points_reset_confirm" || data === "team_points_reset_do" || data === "team_quality_reset_confirm" || data === "team_quality_reset_do" || data === "team_quality_history_clear_confirm" || data === "team_quality_history_clear_do" || data === "streamtime_member_stats_send_group" || data.startsWith("streamtime_member_stats_group:") || data === "team_profile_members" || data === "team_admin_logs" || data.startsWith("team_profile_member:") || data.startsWith("team_history:") || data === "team_individual_picker" || data.startsWith("team_individual_member:") || data.startsWith("team_individual_stream_adjust:") || data.startsWith("team_individual_confirm:") || data.startsWith("team_individual_do:") || data.startsWith("streamreview_target_stats:");
  const evaluatorAction = data === "team_quality_members" || (data.startsWith("team_manage_member:quality:") || data.startsWith("team_quality_score:"));
  if (evaluatorAction && !(await isQualityAdmin(env, userId))) {
    await telegram(env, "answerCallbackQuery", { callback_query_id: callback.id, text: "❌ شما دسترسی ثبت ارزیابی ندارید.", show_alert: true });
    return true;
  }
  if (ownerOnly && userId !== Number(OWNER_ID)) {
    await telegram(env, "answerCallbackQuery", { callback_query_id: callback.id, text: "❌ شما دسترسی ندارید.", show_alert: true });
    return true;
  }
  if (data === "streamannounce_templates") {
    const members = (await getStreamTimeMembers(env)).filter(id => Number(id) !== Number(OWNER_ID));
    const rows = [];
    for (const id of members) { const profile = await getTelegramProfile(env, id); const preset = await env.BOT_STATE.get(`team:announce_template:${id}`, "json"); rows.push([{ text: `${preset ? "✅" : "➕"} ${getPublicUserName(profile, id)}`, callback_data: `streamannounce_template_member:${id}` }]); }
    rows.push([{ text: "🔙 داشبورد مدیریت", callback_data: "team_dashboard" }]);
    await telegram(env, "sendMessage", { chat_id: chatId, text: "🧩 <b>قالب‌های آماده اعلام استریم</b>\n\nعضو را انتخاب کن تا لینک، عکس و عنوان‌های آماده‌اش را ثبت یا اصلاح کنی.", parse_mode: "HTML", reply_markup: { inline_keyboard: rows } });
    await telegram(env, "answerCallbackQuery", { callback_query_id: callback.id }); return true;
  }
  if (data.startsWith("streamannounce_template_member:")) {
    const targetId = Number(data.split(":")[1]);
    if (!targetId || !(await getStreamTimeMembers(env)).includes(targetId)) { await telegram(env, "answerCallbackQuery", { callback_query_id: callback.id, text: "عضو پیدا نشد.", show_alert: true }); return true; }
    const preset = await env.BOT_STATE.get(`team:announce_template:${targetId}`, "json"); const profile = await getTelegramProfile(env, targetId);
    const body = preset ? `\n\n🔗 لینک: ${escapeHtml(preset.link)}\n📝 عنوان‌ها: ${preset.titles.map(escapeHtml).join("، ")}\n🖼️ عکس: ثبت شده` : "\n\nهنوز قالبی ثبت نشده است.";
    await telegram(env, "sendMessage", { chat_id: chatId, text: `🧩 <b>قالب اعلام استریم</b>\n\n👤 ${escapeHtml(getPublicUserName(profile, targetId))}\n🆔 <code>${targetId}</code>${body}`, parse_mode: "HTML", reply_markup: { inline_keyboard: [[{ text: preset ? "✏️ ثبت / جایگزینی قالب" : "➕ ساخت قالب", callback_data: `streamannounce_template_set:${targetId}` }], ...(preset ? [[{ text: "🗑 حذف قالب", callback_data: `streamannounce_template_delete:${targetId}` }]] : []), [{ text: "🔙 لیست اعضا", callback_data: "streamannounce_templates" }]] } });
    await telegram(env, "answerCallbackQuery", { callback_query_id: callback.id }); return true;
  }
  if (data.startsWith("streamannounce_template_set:")) {
    const targetId = Number(data.split(":")[1]);
    if (!targetId || !(await getStreamTimeMembers(env)).includes(targetId)) { await telegram(env, "answerCallbackQuery", { callback_query_id: callback.id, text: "عضو پیدا نشد.", show_alert: true }); return true; }
    await saveAdminState(env, userId, { action: "announce_template_link", step: 1, data: { targetId } });
    await telegram(env, "sendMessage", { chat_id: chatId, text: `🔗 لینک ثابت استریم برای آیدی ${targetId} را بفرست. بعد عکس و عنوان‌های آماده را ثبت می‌کنی.` });
    await telegram(env, "answerCallbackQuery", { callback_query_id: callback.id }); return true;
  }
  if (data.startsWith("streamannounce_template_delete:")) {
    const targetId = Number(data.split(":")[1]); await env.BOT_STATE.delete(`team:announce_template:${targetId}`);
    await telegram(env, "sendMessage", { chat_id: chatId, text: "🗑 قالب اعلام استریم این عضو حذف شد.", reply_markup: { inline_keyboard: [[{ text: "🔙 قالب‌های اعلام", callback_data: "streamannounce_templates" }]] } });
    await telegram(env, "answerCallbackQuery", { callback_query_id: callback.id }); return true;
  }
  if (data.startsWith("streamannounce_title:")) {
    const parts = data.split(":"); const targetId = Number(parts[1]); const index = Number(parts[2]);
    if (targetId !== userId || !(await isAllowedStreamAnnouncement(env, userId))) { await telegram(env, "answerCallbackQuery", { callback_query_id: callback.id, text: "دسترسی معتبر نیست.", show_alert: true }); return true; }
    const template = await env.BOT_STATE.get(`team:announce_template:${userId}`, "json"); const chats = await getStreamAnnounceChats(env);
    if (!template || !Array.isArray(template.titles) || !template.titles[index] || !template.photo || !template.link || !chats.length) { await telegram(env, "answerCallbackQuery", { callback_query_id: callback.id, text: "قالب یا مقصد اعلام ناقص است؛ با مدیر تماس بگیر.", show_alert: true }); return true; }
    const profile = await getTelegramProfile(env, userId); const name = getPublicUserName(profile, userId);
    const announcementText = `🔴 <b>STREAM IS LIVE</b>\n\n👤 <b>${escapeHtml(name)}</b>\n🎮 <b>${escapeHtml(template.titles[index])}</b>\n\n🔗 ${escapeHtml(template.link)}\n\n#Stream #Live`;
    const result = await sendStreamAnnouncementToAll(env, chats, { type: "photo", photo: template.photo, text: announcementText });
    const reviewResult = await sendStreamReviewPost(env, { targetId: userId, targetName: name, title: template.titles[index], link: template.link, type: "photo", photo: template.photo });
    await telegram(env, "answerCallbackQuery", { callback_query_id: callback.id, text: result.success ? "استریم اعلام شد" : "اعلام استریم ناموفق بود", show_alert: !result.success });
    if (!reviewResult.ok) await telegram(env, "sendMessage", { chat_id: chatId, text: reviewResult.error || "⚠️ پیام ارزیابی ارسال نشد؛ گروه ارزیابی را تنظیم کن." });
    return true;
  }
  if (data === "quality_admin_add" || data === "quality_admin_remove") {
    await saveAdminState(env, userId, { action: data === "quality_admin_add" ? "quality_admin_add_wait_id" : "quality_admin_remove_wait_id", step: 1, data: {} });
    await telegram(env, "sendMessage", { chat_id: chatId, text: data === "quality_admin_add" ? "➕ آیدی عددی تلگرام ادمینی که اجازه ثبت نمره ارزیابی داشته باشد را بفرست." : "➖ آیدی عددی ادمینی که می‌خواهی دسترسی ارزیابی‌اش حذف شود را بفرست." });
    await telegram(env, "answerCallbackQuery", { callback_query_id: callback.id });
    return true;
  }
  if (data === "quality_admin_list") {
    const evaluators = await getQualityEvaluators(env);
    const body = evaluators.length ? evaluators.map((item, i) => `${i + 1}. <b>${escapeHtml(item.gameName || "بدون نام")}</b>\n🎫 رفرال: ${escapeHtml(item.referral || "ثبت نشده")}\n🆔 <code>${Number(item.userId)}</code>`).join("\\n\\n") : "هنوز ارزیاب محدود اضافه نشده است.";
    await telegram(env, "sendMessage", { chat_id: chatId, text: `📋 <b>فهرست ارزیاب‌های محدود</b>\n\n${body}`, parse_mode: "HTML", reply_markup: { inline_keyboard: [[{ text: "➕ افزودن ارزیاب", callback_data: "quality_admin_add" }, { text: "➖ حذف ارزیاب", callback_data: "quality_admin_remove" }], [{ text: "📊 آمار ثبت ارزیابی", callback_data: "sr_reviewers:0" }]] } });
    await telegram(env, "answerCallbackQuery", { callback_query_id: callback.id });
    return true;
  }
  if (data === "legacy_salary_add") {
    const members = (await getStreamTimeMembers(env)).filter(id => Number(id) !== Number(OWNER_ID));
    const rows = [];
    for (const id of members) rows.push([{ text: getPublicUserName(await getTelegramProfile(env, id), id), callback_data: `legacy_salary_member:${id}` }]);
    rows.push([{ text: "🔙 پنل مدیریت", callback_data: "team_dashboard" }]);
    await telegram(env, "sendMessage", { chat_id: chatId, text: "➕ <b>افزودن حقوق‌های قبلی</b>\n\nعضو را انتخاب کن. این بخش فقط آمار حقوق مادام‌العمر را اصلاح می‌کند و برای عضو پیام نمی‌فرستد.", parse_mode: "HTML", reply_markup: { inline_keyboard: rows } });
    await telegram(env, "answerCallbackQuery", { callback_query_id: callback.id });
    return true;
  }
  if (data.startsWith("legacy_salary_member:")) {
    const targetId = Number(data.split(":")[1]);
    if (!targetId || !(await getStreamTimeMembers(env)).includes(targetId)) { await telegram(env, "answerCallbackQuery", { callback_query_id: callback.id, text: "عضو نامعتبر است.", show_alert: true }); return true; }
    await telegram(env, "sendMessage", { chat_id: chatId, text: `➕ افزودن حقوق قبلی برای ${escapeHtml(getPublicUserName(await getTelegramProfile(env, targetId), targetId))}\n\nنوع حقوق را انتخاب کن:`, parse_mode: "HTML", reply_markup: { inline_keyboard: [[{ text: "💵 پول بازی", callback_data: `legacy_salary_currency:${targetId}:money` }], [{ text: "🥇 گلد بازی", callback_data: `legacy_salary_currency:${targetId}:gold` }], [{ text: "🪙 توکن بازی", callback_data: `legacy_salary_currency:${targetId}:token` }], [{ text: "🔙 انتخاب عضو", callback_data: "legacy_salary_add" }]] } });
    await telegram(env, "answerCallbackQuery", { callback_query_id: callback.id });
    return true;
  }
  if (data.startsWith("legacy_salary_currency:")) {
    const [, target, currency] = data.split(":");
    const targetId = Number(target);
    if (!targetId || !["money", "gold", "token"].includes(currency) || !(await getStreamTimeMembers(env)).includes(targetId)) { await telegram(env, "answerCallbackQuery", { callback_query_id: callback.id, text: "اطلاعات نامعتبر است.", show_alert: true }); return true; }
    await saveAdminState(env, userId, { action: "legacy_salary_add_amount", step: 1, data: { targetId, currency } });
    await telegram(env, "sendMessage", { chat_id: chatId, text: "💰 مبلغ حقوق قبلی را به‌صورت عدد وارد کن. این مبلغ به مجموع مادام‌العمر اضافه می‌شود و از حقوق‌های قبلی کم نمی‌کند." });
    await telegram(env, "answerCallbackQuery", { callback_query_id: callback.id });
    return true;
  }
  if (data.startsWith("salary_delete:") || data.startsWith("salary_edit:")) {
    const editing = data.startsWith("salary_edit:");
    const [, target, week] = data.split(":");
    const targetId = Number(target);
    const payment = await env.BOT_STATE.get(`team:payment:${targetId}`, "json");
    if (!targetId || !payment || payment.week !== week) { await telegram(env, "answerCallbackQuery", { callback_query_id: callback.id, text: "حقوق این هفته پیدا نشد.", show_alert: true }); return true; }
    const pendingForDelete = await env.BOT_STATE.get(`team:salary_pending:${targetId}`, "json");
    for (const messageId of [payment.memberMessageId, pendingForDelete?.choiceMessageId]) {
      if (messageId) await telegram(env, "deleteMessage", { chat_id: targetId, message_id: Number(messageId) });
    }
    if (payment.ownerMessageId) await telegram(env, "deleteMessage", { chat_id: OWNER_ID, message_id: Number(payment.ownerMessageId) });
    const groupSentKey = `team:salary_week_group_sent:${week}`;
    const groupSent = await env.BOT_STATE.get(groupSentKey, "json");
    if (groupSent) {
      if (groupSent.groupChatId && groupSent.messageId) {
        await telegram(env, "deleteMessage", { chat_id: groupSent.groupChatId, message_id: Number(groupSent.messageId) });
      }
      await env.BOT_STATE.delete(groupSentKey);
    }
    if (payment.paid === true) {
      const totals = await getLifetimePaidTotals(env, targetId);
      const currency = payment.choice;
      totals[currency] = Math.max(0, Number(totals[currency] || 0) - Math.max(0, Number(payment.amount || 0)));
      if (Number(payment.amount || 0) > 0) totals.count = Math.max(0, Number(totals.count || 0) - 1);
      await env.BOT_STATE.put(`team:lifetime_payments:${targetId}`, JSON.stringify(totals));
      await env.BOT_STATE.delete(`team:payment_history:${week}:${targetId}`);
    }
    await env.BOT_STATE.delete(`team:payment:${targetId}`);
    await env.BOT_STATE.delete(`team:salary_pending:${targetId}`);
    if (editing) {
      await saveAdminState(env, userId, { action: "payment_salary_setup", step: 1, data: { userId: targetId, money: null, gold: null, token: null } });
      await telegram(env, "sendMessage", { chat_id: chatId, text: `✏️ <b>ویرایش حقوق</b>\n\nحقوق قبلی برای ${escapeHtml(getPublicUserName(await getTelegramProfile(env, targetId), targetId))} پاک‌سازی شد و مجموع‌های کلی اصلاح شدند. پیام‌های مرتبطی که هنوز قابل حذف بودند پاک شدند.\n\nمرحله 1 از 3\n💵 مبلغ پول بازی را وارد کن؛ اگر پرداخت نمی‌شود 0 بفرست.`, parse_mode: "HTML" });
      await telegram(env, "answerCallbackQuery", { callback_query_id: callback.id, text: "حقوق قبلی پاک شد؛ مبلغ جدید را وارد کن." });
    } else {
      await telegram(env, "sendMessage", { chat_id: chatId, text: `✅ حقوق ثبت‌شده ${escapeHtml(week)} حذف شد. پیام‌های مرتبطی که هنوز قابل حذف بودند پاک شدند؛ حالا می‌توانی حقوق را دوباره ثبت کنی.`, parse_mode: "HTML", reply_markup: { inline_keyboard: [[{ text: "🧾 ثبت دوباره حقوق", callback_data: `weekly_payment_member:${targetId}` }], [{ text: "📋 سوابق واریزی‌ها", callback_data: "payment_list" }]] } });
      await telegram(env, "answerCallbackQuery", { callback_query_id: callback.id, text: "حقوق حذف شد." });
    }
    return true;
  }
  if (data === "streamtime_payment") {
    await deleteAdminState(env, userId);
    await sendWeeklyPaymentMembers(env, chatId);
    await telegram(env, "answerCallbackQuery", { callback_query_id: callback.id });
    return true;
  }
  if (data.startsWith("weekly_payment_member:")) {
    const targetId = Number(data.split(":")[1]);
    if (!targetId || !(await getStreamTimeMembers(env)).includes(targetId)) {
      await telegram(env, "answerCallbackQuery", { callback_query_id: callback.id, text: "❌ این عضو در لیست StreamTime نیست.", show_alert: true });
      return true;
    }
    const currentPayment = await env.BOT_STATE.get(`team:payment:${targetId}`, "json");
    const currentWeek = getPaymentWeekKey();
    if (currentPayment && currentPayment.week === currentWeek && currentPayment.paid === true) {
      await telegram(env, "answerCallbackQuery", { callback_query_id: callback.id, text: "حقوق این عضو برای هفته جاری قبلاً واریزشده ثبت شده؛ برای جلوگیری از دوباره‌شماری امکان ثبت مجدد نیست.", show_alert: true });
      return true;
    }
    await saveAdminState(env, userId, { action: "payment_salary_setup", step: 1, data: { userId: targetId, money: null, gold: null, token: null } });
    await telegram(env, "sendMessage", { chat_id: chatId, text: `💰 <b>ثبت حقوق هفتگی</b>

👤 ${escapeHtml(getPublicUserName(await getTelegramProfile(env, targetId), targetId))}

مرحله 1 از 3
💵 مبلغ پول بازی را وارد کن؛ اگر پرداخت نمی‌شود 0 بفرست.`, parse_mode: "HTML" });
    await telegram(env, "answerCallbackQuery", { callback_query_id: callback.id });
    return true;
  }
  if (data.startsWith("payment_member:")) {
    const targetId = Number(data.split(":")[1]);
    if (!targetId || !(await getStreamTimeMembers(env)).includes(targetId)) {
      await telegram(env, "answerCallbackQuery", { callback_query_id: callback.id, text: "❌ این عضو در لیست StreamTime نیست.", show_alert: true });
      return true;
    }
    const currentPayment = await env.BOT_STATE.get(`team:payment:${targetId}`, "json");
    const currentWeek = getPaymentWeekKey();
    if (currentPayment && currentPayment.week === currentWeek && currentPayment.paid === true) {
      await telegram(env, "answerCallbackQuery", { callback_query_id: callback.id, text: "حقوق این عضو برای هفته جاری قبلاً واریزشده ثبت شده است.", show_alert: true });
      return true;
    }
    await saveAdminState(env, userId, { action: "payment_salary_setup", step: 1, data: { userId: targetId, money: null, gold: null, token: null } });
    await telegram(env, "sendMessage", { chat_id: chatId, text: `💰 <b>ثبت حقوق هفتگی</b>

👤 ${escapeHtml(getPublicUserName(await getTelegramProfile(env, targetId), targetId))}

مرحله 1 از 3
💵 مبلغ پول بازی را وارد کن؛ اگر پرداخت نمی‌شود 0 بفرست.`, parse_mode: "HTML" });
    await telegram(env, "answerCallbackQuery", { callback_query_id: callback.id });
    return true;
  }
  if (data.startsWith("salary_paid:")) { await telegram(env, "answerCallbackQuery", { callback_query_id: callback.id, text: "این مرحله حذف شده؛ انتخاب حقوق توسط عضو، پرداخت را ثبت می‌کند.", show_alert: true }); return true; }
  if (data.startsWith("salary_group_select:")) { await telegram(env, "answerCallbackQuery", { callback_query_id: callback.id, text: "این مرحله حذف شده؛ انتخاب حقوق توسط عضو به‌عنوان پرداخت ثبت می‌شود.", show_alert: true }); return true; }
  if (data === "trial_duration_cancel") {
    if (env.BOT_STATE) await env.BOT_STATE.delete(`team:trial_duration_state:${chatId}`);
    await telegram(env, "sendMessage", { chat_id: chatId, text: "❌ ثبت Trial لغو شد.", reply_markup: { inline_keyboard: [[{ text: "🟡 مدیریت Trial", callback_data: "trial_manage" }], [{ text: "👥 مدیریت اعضا", callback_data: "team_members_hub" }]] } });
    await telegram(env, "answerCallbackQuery", { callback_query_id: callback.id });
    return true;
  }
  if (data.startsWith("trial_group_select:")) {
    const groupChatId = data.slice("trial_group_select:".length);
    const state = await env.BOT_STATE.get(`team:trial_duration_state:${chatId}`, "json");
    const groups = await getStreamTimeGroups(env);
    const group = groups.find(item => String(item.chatId) === String(groupChatId));
    if (!state || !state.targetId || !state.days || !group) {
      await telegram(env, "answerCallbackQuery", { callback_query_id: callback.id, text: "❌ اطلاعات Trial یا گروه پیدا نشد؛ دوباره شروع کن.", show_alert: true });
      return true;
    }
    await env.BOT_STATE.delete(`team:trial_duration_state:${chatId}`);
    const trialResult = await startTeamTrial(env, state.targetId, Number(state.days), String(group.chatId));
    const until = trialResult.until;
    const profile = await getTelegramProfile(env, state.targetId);
    const groupResultText = trialResult.groupSent ? `📣 پیام شروع در گروه «${escapeHtml(group.title || String(group.chatId))}» ارسال شد.` : `⚠️ ارسال پیام به گروه «${escapeHtml(group.title || String(group.chatId))}» ناموفق بود؛ دسترسی بات به گروه را بررسی کن.`;
    await telegram(env, "sendMessage", { chat_id: chatId, text: `✅ <b>Trial ثبت شد</b>\n\n👤 ${escapeHtml(getPublicUserName(profile, state.targetId))}\n⏳ مدت: <b>${Number(state.days)} روز</b>\n📅 شروع: <b>${new Date(until - Number(state.days) * 86400000).toLocaleDateString("en-GB")}</b>\n📅 پایان: <b>${new Date(until).toLocaleDateString("en-GB")}</b>\n${groupResultText}`, parse_mode: "HTML", reply_markup: { inline_keyboard: [[{ text: "🟡 مدیریت Trial", callback_data: "trial_manage" }], [{ text: "👥 مدیریت اعضا", callback_data: "team_members_hub" }]] } });
    await telegram(env, "answerCallbackQuery", { callback_query_id: callback.id, text: "Trial ثبت شد" });
    return true;
  }
  if (data.startsWith("streamtime_remove_pick:")) {
    const targetId = Number(data.slice("streamtime_remove_pick:".length));
    const members = await getStreamTimeMembers(env);
    if (!targetId || targetId === Number(OWNER_ID) || !members.includes(targetId)) {
      await telegram(env, "answerCallbackQuery", { callback_query_id: callback.id, text: "❌ این عضو در فهرست نیست.", show_alert: true });
      return true;
    }
    const profile = await getTelegramProfile(env, targetId);
    await telegram(env, "sendMessage", { chat_id: chatId, text: `⚠️ <b>حذف عضو از StreamTime</b>\n\n👤 ${escapeHtml(getPublicUserName(profile, targetId))}\n🆔 <code>${targetId}</code>\n\nعضویت StreamTime و دسترسی‌های Support، پروفایل، ارزیابی، Referral و اعلام استریم حذف می‌شود؛ آمار و تاریخچه حفظ می‌شود.`, parse_mode: "HTML", reply_markup: { inline_keyboard: [[{ text: "✅ بله، حذف کن", callback_data: `streamtime_remove_confirm:${targetId}` }], [{ text: "❌ انصراف", callback_data: "streamtime_menu_members" }]] } });
    await telegram(env, "answerCallbackQuery", { callback_query_id: callback.id });
    return true;
  }
  if (data.startsWith("streamtime_remove_confirm:")) {
    const targetId = Number(data.slice("streamtime_remove_confirm:".length));
    const members = await getStreamTimeMembers(env);
    if (!targetId || targetId === Number(OWNER_ID) || !members.includes(targetId)) {
      await telegram(env, "answerCallbackQuery", { callback_query_id: callback.id, text: "❌ این عضو قبلاً حذف شده یا وجود ندارد.", show_alert: true });
      return true;
    }
    await saveStreamTimeMembers(env, members.filter(id => Number(id) !== targetId));
    await deleteUserReferral(env, targetId);
    await deleteStreamAnnouncementAccess(env, targetId);
    await removeSupportAdmin(env, targetId);
    const profileAllowed = await getProfileAllowedUsers(env);
    await saveProfileAllowedUsers(env, profileAllowed.filter(id => Number(id) !== targetId));
    const qualityAdmins = await getQualityAdmins(env);
    await env.BOT_STATE.put("team:quality_admins", JSON.stringify(qualityAdmins.filter(id => Number(id) !== targetId)));
    await deleteAdminState(env, userId);
    const profile = await getTelegramProfile(env, targetId);
    await telegram(env, "sendMessage", { chat_id: chatId, text: `✅ عضو از StreamTime حذف شد.\n\n👤 ${escapeHtml(getPublicUserName(profile, targetId))}\n🆔 <code>${targetId}</code>\n\nآمار، پوینت‌ها و تاریخچه ارزیابی حفظ شدند.`, parse_mode: "HTML", reply_markup: { inline_keyboard: [[{ text: "➕ افزودن عضو", callback_data: "streamtime_add" }, { text: "➖ حذف عضو دیگر", callback_data: "streamtime_remove" }], [{ text: "👥 مدیریت اعضا", callback_data: "team_members_hub" }]] } });
    await telegram(env, "answerCallbackQuery", { callback_query_id: callback.id, text: "عضو حذف شد" });
    return true;
  }
  if (data === "team_profile" || data === "team_leaderboard") {
    const members = await getStreamTimeMembers(env);
    if (data === "team_profile" && userId !== Number(OWNER_ID) && !(await isAllowedProfile(env, userId))) {
      await telegram(env, "answerCallbackQuery", { callback_query_id: callback.id, text: "❌ شما دسترسی پروفایل ندارید.", show_alert: true });
      return true;
    }
    if (data === "team_leaderboard") {
      await sendTeamLeaderboard(env, chatId);
      await telegram(env, "answerCallbackQuery", { callback_query_id: callback.id });
      return true;
    }
    if (data === "team_profile") await sendTeamProfile(env, chatId, userId);
    else await sendTeamLeaderboard(env, chatId);
    await telegram(env, "answerCallbackQuery", { callback_query_id: callback.id });
    return true;
  }
  if (data === "team_members_hub") { await sendTeamMembersHub(env, chatId); await telegram(env, "answerCallbackQuery", { callback_query_id: callback.id }); return true; }
  if (data.startsWith("team_member_card:")) {
    const targetId = Number(data.split(":")[1]);
    await sendTeamMemberCard(env, chatId, targetId);
    await telegram(env, "answerCallbackQuery", { callback_query_id: callback.id });
    return true;
  }
  if (data.startsWith("team_member_section:")) {
    const parts = data.split(":");
    await sendTeamMemberSection(env, chatId, parts[1], Number(parts[2]));
    await telegram(env, "answerCallbackQuery", { callback_query_id: callback.id });
    return true;
  }
  if (data.startsWith("team_member_toggle:")) {
    const parts = data.split(":");
    const permission = parts[1];
    const targetId = Number(parts[2]);
    await toggleUnifiedUserAccess(env, chatId, targetId, permission, true);
    await telegram(env, "answerCallbackQuery", { callback_query_id: callback.id });
    return true;
  }
  if (data.startsWith("team_member_trial_start:") || data.startsWith("team_member_trial_stop:")) {
    const start = data.startsWith("team_member_trial_start:");
    const targetId = Number(data.split(":")[1]);
    if (!targetId || !(await getStreamTimeMembers(env)).includes(targetId)) {
      await telegram(env, "answerCallbackQuery", { callback_query_id: callback.id, text: "❌ این شخص عضو StreamTime نیست.", show_alert: true });
      return true;
    }
    if (start) {
      await promptTeamTrialDuration(env, chatId, targetId);
    } else {
      await stopTeamTrial(env, targetId);
      await sendTeamMemberSection(env, chatId, "trial", targetId);
    }
    await telegram(env, "answerCallbackQuery", { callback_query_id: callback.id, text: start ? "مدت Trial را وارد کن" : "Trial پایان یافت" });
    return true;
  }
  if (data.startsWith("team_member_game_name:")) {
    const targetId = Number(data.split(":")[1]);
    if (!targetId || !(await getStreamTimeMembers(env)).includes(targetId)) {
      await telegram(env, "answerCallbackQuery", { callback_query_id: callback.id, text: "❌ این شخص عضو StreamTime نیست.", show_alert: true });
      return true;
    }
    await saveAdminState(env, userId, { action: "game_name_edit", step: 1, data: { userId: targetId } });
    await telegram(env, "sendMessage", { chat_id: chatId, text: `🎮 <b>ثبت / تغییر اسم گیم</b>\n\nاسم فعلی: <b>${escapeHtml(await getTeamGameName(env, targetId) || "ثبت نشده")}</b>\n\nاسم جدید را بفرست؛ این اسم در لیست‌ها نمایش داده می‌شود.`, parse_mode: "HTML", reply_markup: { inline_keyboard: [[{ text: "🔙 بازگشت به پرونده عضو", callback_data: `team_member_card:${targetId}` }]] } });
    await telegram(env, "answerCallbackQuery", { callback_query_id: callback.id });
    return true;
  }
  if (data.startsWith("team_member_referral:")) {
    const targetId = Number(data.split(":")[1]);
    if (!targetId || !(await getStreamTimeMembers(env)).includes(targetId)) {
      await telegram(env, "answerCallbackQuery", { callback_query_id: callback.id, text: "❌ این شخص عضو StreamTime نیست.", show_alert: true });
      return true;
    }
    await saveAdminState(env, userId, { action: "referral", step: 2, data: { userId: targetId } });
    await telegram(env, "sendMessage", { chat_id: chatId, text: `🎫 <b>ثبت / تغییر Referral</b>\n\n${formatTelegramProfile(await getTelegramProfile(env, targetId), targetId)}\nReferral فعلی: <b>${escapeHtml(String(await getUserReferral(env, targetId) || "ثبت نشده"))}</b>\n\nReferral جدید را ارسال کن:`, parse_mode: "HTML", reply_markup: { inline_keyboard: [[{ text: "🔙 بازگشت به پرونده عضو", callback_data: `team_member_card:${targetId}` }]] } });
    await telegram(env, "answerCallbackQuery", { callback_query_id: callback.id });
    return true;
  }
  if (data.startsWith("team_member_time:")) {
    const parts = data.split(":");
    const action = parts[1];
    const targetId = Number(parts[2]);
    if (!targetId || !["add", "remove"].includes(action) || !(await getStreamTimeMembers(env)).includes(targetId)) {
      await telegram(env, "answerCallbackQuery", { callback_query_id: callback.id, text: "❌ عضو نامعتبر است.", show_alert: true });
      return true;
    }
    await saveAdminState(env, userId, { action: action === "add" ? "manual_stream_add" : "manual_stream_remove", step: 1, data: { userId: targetId } });
    await telegram(env, "sendMessage", { chat_id: chatId, text: `${action === "add" ? "➕ ثبت" : "➖ حذف"} تایم برای ${escapeHtml(getPublicUserName(await getTelegramProfile(env, targetId), targetId))}\n\nمدت زمان را وارد کن. مثال: <code>2:30</code>`, parse_mode: "HTML", reply_markup: { inline_keyboard: [[{ text: "🔙 بازگشت به پرونده عضو", callback_data: `team_member_card:${targetId}` }]] } });
    await telegram(env, "answerCallbackQuery", { callback_query_id: callback.id });
    return true;
  }
  if (data === "streamtime_member_stats_send_group") {
    const groups = await getStreamTimeGroups(env);
    if (!groups.length) {
      await telegram(env, "sendMessage", { chat_id: chatId, text: "❌ هنوز هیچ گروهی برای دریافت گزارش StreamTime ثبت نشده است.", reply_markup: { inline_keyboard: [[{ text: "🔙 گزارش‌ها و آمار", callback_data: "streamtime_menu_reports" }]] } });
    } else {
      const rows = groups.map(group => [{ text: `📡 ${group.title}`, callback_data: `streamtime_member_stats_group:${group.chatId}` }]);
      rows.push([{ text: "🔙 گزارش‌ها و آمار", callback_data: "streamtime_menu_reports" }]);
      await telegram(env, "sendMessage", { chat_id: chatId, text: "📨 <b>ارسال گزارش StreamTime</b>\n\nفقط گروهی را انتخاب کن که می‌خواهی گزارش کامل اعضا در آن ارسال شود:", parse_mode: "HTML", reply_markup: { inline_keyboard: rows } });
    }
    await telegram(env, "answerCallbackQuery", { callback_query_id: callback.id });
    return true;
  }
  if (data.startsWith("streamtime_member_stats_group:")) {
    const targetChatId = data.slice("streamtime_member_stats_group:".length);
    const groups = await getStreamTimeGroups(env);
    const group = groups.find(item => String(item.chatId) === String(targetChatId));
    if (!group) {
      await telegram(env, "answerCallbackQuery", { callback_query_id: callback.id, text: "❌ گروه پیدا نشد یا از لیست حذف شده است.", show_alert: true });
      return true;
    }
    const report = await buildStreamTimeMemberStatsReport(env);
    const result = await telegram(env, "sendMessage", { chat_id: group.chatId, text: report.message, parse_mode: "HTML", disable_web_page_preview: true });
    await telegram(env, "sendMessage", { chat_id: chatId, text: result?.ok ? `✅ گزارش کامل StreamTime فقط در گروه «${escapeHtml(group.title)}» ارسال شد.` : `❌ ارسال گزارش به «${escapeHtml(group.title)}» ناموفق بود. بات باید داخل همان گروه اجازه ارسال پیام داشته باشد.` , parse_mode: "HTML", reply_markup: { inline_keyboard: [[{ text: "📨 ارسال به گروه دیگر", callback_data: "streamtime_member_stats_send_group" }], [{ text: "🔙 گزارش‌ها و آمار", callback_data: "streamtime_menu_reports" }]] } });
    await telegram(env, "answerCallbackQuery", { callback_query_id: callback.id });
    return true;
  }
  if (data === "team_quality_history_clear_confirm") {
    await telegram(env, "sendMessage", { chat_id: chatId, text: "⚠️ <b>پاک‌کردن تاریخچه ارزیابی‌ها</b>\n\nتاریخچه ارزیابی تمام اعضای تیم پاک می‌شود تا ارزیابی‌های آزمایشی قبلی دیگر در پرونده اعضا نمایش داده نشوند.\n\n⭐ پوینت‌ها، رتبه‌ها، نمره ارزیابی فعلی و تاریخچه پاداش‌ها پاک نمی‌شوند.", parse_mode: "HTML", reply_markup: { inline_keyboard: [[{ text: "🗑 بله، تاریخچه ارزیابی‌ها پاک شود", callback_data: "team_quality_history_clear_do" }], [{ text: "❌ لغو", callback_data: "team_points_manage" }]] } });
    await telegram(env, "answerCallbackQuery", { callback_query_id: callback.id });
    return true;
  }
  if (data === "team_quality_history_clear_do") {
    const users = await getTeamUsers(env);
    let cleared = 0;
    for (const id of users) {
      const stats = await getTeamStats(env, id);
      const count = Array.isArray(stats.qualityHistory) ? stats.qualityHistory.length : 0;
      if (count) cleared += count;
      stats.qualityHistory = [];
      await saveTeamStats(env, id, stats);
    }
    await addTeamAdminLog(env, "quality_history_clear", 0, { members: users.length, evaluations: cleared });
    await telegram(env, "sendMessage", { chat_id: chatId, text: `✅ <b>تاریخچه ارزیابی‌ها پاک شد.</b>\n\n👥 اعضای بررسی‌شده: <b>${users.length}</b>\n🗑 ارزیابی‌های پاک‌شده: <b>${cleared}</b>\n\nپوینت‌ها، رتبه‌ها و نمره ارزیابی فعلی دست‌نخورده ماندند.`, parse_mode: "HTML", reply_markup: { inline_keyboard: [[{ text: "🔙 مدیریت رنک و امتیاز", callback_data: "team_points_manage" }]] } });
    await telegram(env, "answerCallbackQuery", { callback_query_id: callback.id, text: "تاریخچه پاک شد" });
    return true;
  }
  if (data === "team_dashboard") { await sendTeamDashboard(env, chatId); await telegram(env, "answerCallbackQuery", { callback_query_id: callback.id }); return true; }
  if (data === "team_points_manage") { await sendTeamPointsMenu(env, chatId); await telegram(env, "answerCallbackQuery", { callback_query_id: callback.id }); return true; }
  if (data === "team_profile_members") { await sendTeamProfileMembers(env, chatId); await telegram(env, "answerCallbackQuery", { callback_query_id: callback.id }); return true; }
  if (data === "team_admin_logs") { await sendTeamAdminLogs(env, chatId); await telegram(env, "answerCallbackQuery", { callback_query_id: callback.id }); return true; }
  if (data.startsWith("team_profile_member:")) {
    const targetId = Number(data.split(":")[1]);
    if (!targetId || !(await getTeamUsers(env)).includes(targetId)) { await telegram(env, "answerCallbackQuery", { callback_query_id: callback.id, text: "❌ عضو نامعتبر است.", show_alert: true }); return true; }
    await sendTeamProfile(env, chatId, targetId, userId);
    await telegram(env, "answerCallbackQuery", { callback_query_id: callback.id });
    return true;
  }
  if (data.startsWith("team_history:")) {
    const targetId = Number(data.split(":")[1]);
    await sendTeamHistory(env, chatId, targetId);
    await telegram(env, "answerCallbackQuery", { callback_query_id: callback.id });
    return true;
  }
  if (data === "team_individual_picker") { await sendIndividualResetPicker(env, chatId); await telegram(env, "answerCallbackQuery", { callback_query_id: callback.id }); return true; }
  if (data.startsWith("team_individual_member:")) {
    const targetId = Number(data.split(":")[1]);
    await sendIndividualResetMenu(env, chatId, targetId);
    await telegram(env, "answerCallbackQuery", { callback_query_id: callback.id });
    return true;
  }
  if (data.startsWith("team_individual_stream_adjust:")) {
    const parts = data.split(":");
    await promptIndividualStreamCountAdjust(env, chatId, parts[1], Number(parts[2]));
    await telegram(env, "answerCallbackQuery", { callback_query_id: callback.id });
    return true;
  }
  if (data.startsWith("team_individual_confirm:")) {
    const parts = data.split(":");
    await confirmIndividualReset(env, chatId, parts[1], Number(parts[2]));
    await telegram(env, "answerCallbackQuery", { callback_query_id: callback.id });
    return true;
  }
  if (data.startsWith("team_individual_do:")) {
    const parts = data.split(":");
    await applyIndividualReset(env, chatId, parts[1], Number(parts[2]));
    await telegram(env, "answerCallbackQuery", { callback_query_id: callback.id, text: "عملیات انجام شد" });
    return true;
  }
  if (data === "team_quality_members") { await sendTeamMemberPicker(env, chatId, "quality"); await telegram(env, "answerCallbackQuery", { callback_query_id: callback.id }); return true; }
  if (data === "team_bonus_members") { await sendTeamMemberPicker(env, chatId, "bonus"); await telegram(env, "answerCallbackQuery", { callback_query_id: callback.id }); return true; }
  if (data === "team_company_donation_ledger") {
    await sendCompanyDonationLedger(env, chatId);
    await telegram(env, "answerCallbackQuery", { callback_query_id: callback.id });
    return true;
  }
  if (data.startsWith("team_company_donation_entry:")) {
    await sendCompanyDonationEntryMenu(env, chatId, data.slice("team_company_donation_entry:".length));
    await telegram(env, "answerCallbackQuery", { callback_query_id: callback.id });
    return true;
  }
  if (data.startsWith("team_company_donation_edit:")) {
    await editCompanyDonationPrompt(env, chatId, data.slice("team_company_donation_edit:".length));
    await telegram(env, "answerCallbackQuery", { callback_query_id: callback.id });
    return true;
  }
  if (data.startsWith("team_company_donation_delete_confirm:")) {
    const entryId = data.slice("team_company_donation_delete_confirm:".length);
    const entries = await getCompanyDonationEntries(env);
    const entry = entries.find(item => String(item.id) === String(entryId));
    if (!entry) await telegram(env, "sendMessage", { chat_id: chatId, text: "❌ این ثبت پیدا نشد.", reply_markup: { inline_keyboard: [[{ text: "📒 دفترچه دونیت", callback_data: "team_company_donation_ledger" }]] } });
    else await telegram(env, "sendMessage", { chat_id: chatId, text: `⚠️ مطمئنی فقط همین ثبت دونیت به مبلغ <b>${Number(entry.amount || 0).toLocaleString("en-US")}</b> حذف شود؟

مجموع کل به همان اندازه کاهش پیدا می‌کند؛ سایر ثبت‌ها حذف نمی‌شوند.`, parse_mode: "HTML", reply_markup: { inline_keyboard: [[{ text: "🗑 بله، همین ثبت حذف شود", callback_data: `team_company_donation_delete:${entryId}` }], [{ text: "❌ انصراف", callback_data: `team_company_donation_entry:${entryId}` }]] } });
    await telegram(env, "answerCallbackQuery", { callback_query_id: callback.id });
    return true;
  }
  if (data.startsWith("team_company_donation_delete:")) {
    await deleteCompanyDonation(env, chatId, data.slice("team_company_donation_delete:".length));
    await telegram(env, "answerCallbackQuery", { callback_query_id: callback.id, text: "ثبت دونیت بروزرسانی شد" });
    return true;
  }
  if (data === "team_company_donation_add") {
    await env.BOT_STATE.put(`team:company_donation_state:${chatId}`, JSON.stringify({ createdAt: Date.now() }), { expirationTtl: 900 });
    const total = Math.max(0, Number(await env.BOT_STATE.get("team:company_donations_total") || 0));
    await telegram(env, "sendMessage", { chat_id: chatId, text: `🎁 <b>ثبت دونیت از سمت مجموعه</b>

مجموع ثبت‌شده فعلی: <b>${total.toLocaleString("en-US")}</b>

مبلغ دونیت جدید را به‌صورت عدد صحیح بفرست. مبلغ به مجموع قبلی اضافه می‌شود و فقط در آمار کلی رتبه‌بندی نمایش داده خواهد شد.`, parse_mode: "HTML", reply_markup: { inline_keyboard: [[{ text: "❌ لغو", callback_data: "team_input_cancel:donation" }]] } });
    await telegram(env, "answerCallbackQuery", { callback_query_id: callback.id });
    return true;
  }
  if (data.startsWith("team_input_cancel:")) {
    const parts = data.split(":");
    await env.BOT_STATE.delete(`team:stream_count_adjust_state:${chatId}`);
    await env.BOT_STATE.delete(`team:company_donation_state:${chatId}`);
    await env.BOT_STATE.delete(`team:company_donation_edit_state:${chatId}`);
    if (parts[1] === "stream_count") await sendIndividualResetMenu(env, chatId, Number(parts[2]));
    else await sendTeamDashboard(env, chatId);
    await telegram(env, "answerCallbackQuery", { callback_query_id: callback.id, text: "لغو شد" });
    return true;
  }
  if (data === "team_rank_list") { await sendTeamRankList(env, chatId); await telegram(env, "answerCallbackQuery", { callback_query_id: callback.id }); return true; }
  if (data === "team_quality_reset_confirm") { await telegram(env, "sendMessage", { chat_id: chatId, text: "⚠️ <b>ریست نمره ارزیابی فعلی</b>\n\nفقط نمره‌های ارزیابی فعلی همه اعضا پاک می‌شود.\nامتیاز فعال، تایم، تعداد استریم و تاریخچه ارزیابی‌ها دست‌نخورده می‌مانند.", parse_mode: "HTML", reply_markup: { inline_keyboard: [[{ text: "✅ بله، نمره‌ها را ریست کن", callback_data: "team_quality_reset_do" }], [{ text: "❌ لغو", callback_data: "team_points_manage" }]] } }); await telegram(env, "answerCallbackQuery", { callback_query_id: callback.id }); return true; }
  if (data === "team_quality_reset_do") { await resetTeamQualityCurrent(env, chatId); await telegram(env, "answerCallbackQuery", { callback_query_id: callback.id, text: "نمره‌ها ریست شد" }); return true; }
  if (data === "team_reset_confirm") { await telegram(env, "sendMessage", { chat_id: chatId, text: "⚠️ <b>ریست تایم و تعداد استریم</b>\n\nفقط مجموع تایم، تعداد استریم و زمان آخرین فعالیت همه اعضا صفر می‌شود.\n⭐ امتیازها و نمره ارزیابی تغییر نمی‌کنند.", parse_mode: "HTML", reply_markup: { inline_keyboard: [[{ text: "✅ بله، فقط تایم ریست شود", callback_data: "team_reset_do" }], [{ text: "❌ لغو", callback_data: "team_points_manage" }]] } }); await telegram(env, "answerCallbackQuery", { callback_query_id: callback.id }); return true; }
  if (data === "team_reset_do") { await resetTeamTime(env, chatId); await telegram(env, "answerCallbackQuery", { callback_query_id: callback.id, text: "تایم ریست شد؛ امتیازها حفظ شدند" }); return true; }
  if (data === "team_points_reset_confirm") { await telegram(env, "sendMessage", { chat_id: chatId, text: "⚠️ <b>ریست کامل امتیازها</b>\n\nامتیاز فعال و پوینت پاداش همه اعضا صفر می‌شود و امتیاز عددی ارزیابی فعلی نیز صفر می‌شود.\n⏱️ تایم و تعداد استریم تغییر نمی‌کند.\n📚 تاریخچه ارزیابی‌ها و تاریخچه پاداش‌ها برای سوابق باقی می‌مانند.", parse_mode: "HTML", reply_markup: { inline_keyboard: [[{ text: "⭐ بله، همه امتیازهای فعال صفر شوند", callback_data: "team_points_reset_do" }], [{ text: "❌ لغو", callback_data: "team_points_manage" }]] } }); await telegram(env, "answerCallbackQuery", { callback_query_id: callback.id }); return true; }
  if (data === "team_points_reset_do") { await resetTeamPoints(env, chatId); await telegram(env, "answerCallbackQuery", { callback_query_id: callback.id, text: "تمام امتیازهای فعال صفر شدند" }); return true; }
  if (data.startsWith("team_manage_member:")) {
    const parts = data.split(":");
    const action = parts[1];
    const targetId = Number(parts[2]);
    if (!targetId || !["quality", "bonus"].includes(action)) { await telegram(env, "answerCallbackQuery", { callback_query_id: callback.id, text: "❌ عضو نامعتبر است.", show_alert: true }); return true; }
    if (action === "quality") await startTeamQuality(env, chatId, targetId);
    else await startTeamBonus(env, chatId, targetId);
    await telegram(env, "answerCallbackQuery", { callback_query_id: callback.id });
    return true;
  }
  if (data.startsWith("team_quality_score:")) {
    const score = Number(data.slice("team_quality_score:".length));
    const state = await env.BOT_STATE.get(`team:quality_state:${chatId}`, "json");
    if (!state || !Number.isInteger(score) || score < 0 || score > 10) { await telegram(env, "answerCallbackQuery", { callback_query_id: callback.id, text: "❌ ارزیابی منقضی شده.", show_alert: true }); return true; }
    state.scores.push(score);
    state.index += 1;
    if (state.index >= TEAM_QUALITY_ITEMS.length) await finishTeamQuality(env, chatId, state);
    else { await env.BOT_STATE.put(`team:quality_state:${chatId}`, JSON.stringify(state), { expirationTtl: 1800 }); await sendTeamQualityScore(env, chatId, state); }
    await telegram(env, "answerCallbackQuery", { callback_query_id: callback.id, text: `نمره ${score}/10 ثبت شد` });
    return true;
  }
  if (data.startsWith("payment_choice:")) {
    const parts =
      data.split(":");
    const targetId =
      Number(
        parts[1]
      );
    const choice =
      parts[2];

    if (
      targetId !== userId ||
      ![
        "money",
        "gold",
        "token"
      ].includes(choice)
    ) {
      await telegram(
        env,
        "answerCallbackQuery",
        {
          callback_query_id:
            callback.id,
          text:
            "❌ این انتخاب معتبر نیست.",
          show_alert:
            true
        }
      );
      return true;
    }

    const pending =
      await env.BOT_STATE.get(
        `team:salary_pending:${targetId}`,
        "json"
      );

    const members =
      await getStreamTimeMembers(
        env
      );

    if (
      !pending ||
      Number(
        pending.ownerId
      ) !==
        Number(
          OWNER_ID
        ) ||
      !members.includes(
        targetId
      )
    ) {
      await telegram(
        env,
        "answerCallbackQuery",
        {
          callback_query_id:
            callback.id,
          text:
            "❌ اطلاعات حقوق منقضی شده است.",
          show_alert:
            true
        }
      );
      return true;
    }

    if (
      pending.selected
    ) {
      await telegram(
        env,
        "answerCallbackQuery",
        {
          callback_query_id:
            callback.id,
          text:
            "❌ حقوق این هفته قبلاً انتخاب شده است.",
          show_alert:
            true
        }
      );
      return true;
    }

    pending.selected =
      choice;
    pending.selectedAt =
      Date.now();

    const amount =
      Number(
        pending[choice] || 0
      );

    const labels = {
      money:
        "💵 پول بازی",
      gold:
        "🥇 گلد بازی",
      token:
        "🪙 توکن بازی"
    };

    await env.BOT_STATE.put(
      `team:salary_pending:${targetId}`,
      JSON.stringify(
        pending
      ),
      {
        expirationTtl:
          604800
      }
    );

    await env.BOT_STATE.put(
      `team:payment:${targetId}`,
      JSON.stringify(
        {
          userId:
            targetId,
          referral:
            pending.referral || "",
          choice,
          amount,
          money:
            Number(
              pending.money || 0
            ),
          gold:
            Number(
              pending.gold || 0
            ),
          token:
            Number(
              pending.token || 0
            ),
          selectedAt:
            pending.selectedAt,
          paid: true,
          paidAt: Date.now(),
          week:
            pending.week ||
            getPaymentWeekKey()
        }
      )
    );

    const paidWeek = pending.week || getPaymentWeekKey();
    const paidAt = Date.now();
    // Ensure one-time migration of any old cache-only balance happens before
    // the new payment row is added to the ledger.
    await getLifetimePaidTotals(env, targetId);
    const paidRecord = await env.BOT_STATE.get(`team:payment:${targetId}`, "json");
    if (paidRecord) {
      paidRecord.paid = true;
      paidRecord.paidAt = paidAt;
      await env.BOT_STATE.put(`team:payment:${targetId}`, JSON.stringify(paidRecord));
      await env.BOT_STATE.put(`team:payment_history:${paidWeek}:${targetId}`, JSON.stringify({ ...paidRecord, userId: targetId, week: paidWeek, paid: true, paidAt }));
      // Rebuild the lifetime totals from all historical and current payment rows.
      await getLifetimePaidTotals(env, targetId);
    }

    const profile =
      await getTelegramProfile(
        env,
        targetId
      );

    const name =
      getPublicUserName(
        profile,
        targetId
      );

    const memberPaymentMessage = await telegram(
      env,
      "sendMessage",
      {
        chat_id:
          targetId,
        text:
          `✅ <b>انتخاب حقوق ثبت شد</b>

` +
          `${labels[choice]}
` +
          `💰 مبلغ: <b>${amount.toLocaleString("en-US")}</b>`,
        parse_mode:
          "HTML"
      }
    );

    const ownerPaymentMessage = await telegram(
      env,
      "sendMessage",
      {
        chat_id:
          OWNER_ID,
        text:
          `📥 <b>انتخاب حقوق استریمر</b>

` +
          `👤 ${escapeHtml(name)}
` +
          `🔢 Referral: <b>${escapeHtml(String(pending.referral || "ثبت نشده"))}</b>
` +
          `${labels[choice]}
` +
          `💰 مبلغ: <b>${amount.toLocaleString("en-US")}</b>`,
        parse_mode:
          "HTML",
        reply_markup: { inline_keyboard: [[{ text: "💰 حقوق این هفته", callback_data: "payment_list" }]] }
      }
    );
    const savedPayment = await env.BOT_STATE.get(`team:payment:${targetId}`, "json");
    if (savedPayment) {
      savedPayment.memberMessageId = memberPaymentMessage?.result?.message_id || null;
      savedPayment.ownerMessageId = ownerPaymentMessage?.result?.message_id || null;
      await env.BOT_STATE.put(`team:payment:${targetId}`, JSON.stringify(savedPayment));
    }
    await telegram(
      env,
      "answerCallbackQuery",
      {
        callback_query_id:
          callback.id,
        text:
          "✅ انتخاب ثبت شد"
      }
    );

    return true;
  }
  return false;
}
async function saveStreamReminder(env, userId, data) {
  if (!env.BOT_STATE || !data?.date || !data?.timeStart) return;
  const m = String(data.date).match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
  const t = String(data.timeStart).match(/^(\d{1,2}):(\d{2})$/);
  if (!m || !t) return;
  const day = Number(m[1]), month = Number(m[2]), year = Number(m[3]);
  const hour = Number(t[1]), minute = Number(t[2]);
  const utc = Date.UTC(year, month - 1, day, hour - 3, minute - 30);
  if (utc <= Date.now()) return;
  const reminderAt = utc - 30 * 60 * 1000;
  if (reminderAt <= Date.now()) return;
  const id = `${Number(userId)}_${reminderAt}`;
  await env.BOT_STATE.put(`team:reminder:${id}`, JSON.stringify({ id, userId: Number(userId), reminderAt, data, sent: false }));
}
async function processTeamReminders(env) {
  const ids = await getUsersByPrefix(env, "team:reminder:");
  const now = Date.now();
  for (const id of ids) {
    const r = await env.BOT_STATE.get(`team:reminder:${id}`, "json");
    if (!r || r.sent || Number(r.reminderAt) > now) continue;
    const result = await telegram(env, "sendMessage", { chat_id: r.userId, text: `🔔 یادآوری استریم\n\n⏰ ۳۰ دقیقه تا شروع StreamTime شما باقی مانده است.\n🎮 لینک: ${r.data?.linkStream || "ثبت نشده"}` });
    if (result?.ok) { r.sent = true; await env.BOT_STATE.put(`team:reminder:${id}`, JSON.stringify(r), { expirationTtl: 172800 }); }
  }
}
async function processDailyOwnerReport(env) {
  if (!env.BOT_STATE) return;
  // The report covers the previous Iran calendar day; Cloudflare Cron must run once daily.
  const reportDate = getIranDateKey(Date.now() - 86400000);
  const sentKey = `team:daily_report_sent:${reportDate}`;
  if (await env.BOT_STATE.get(sentKey)) return;
  const keys = await listAllBotStateKeys(env, `team:daily_streams:${reportDate}:`);
  const entries = [];
  let totalStreams = 0;
  let totalMinutes = 0;
  for (const key of keys) {
    const item = await env.BOT_STATE.get(key, "json");
    if (!item) continue;
    const streams = Number(item.streams || 0);
    const minutes = Number(item.minutes || 0);
    if (streams <= 0 && minutes <= 0) continue;
    const profile = await getTelegramProfile(env, Number(item.userId || key.split(":").pop()));
    entries.push({ id: Number(item.userId || key.split(":").pop()), name: getPublicUserName(profile, Number(item.userId || key.split(":").pop())), streams, minutes, lastStreamAt: Number(item.lastStreamAt || 0) });
    totalStreams += streams;
    totalMinutes += minutes;
  }
  entries.sort((a, b) => b.minutes - a.minutes);
  let text = `🌙 <b>گزارش روزانه تیم استریمرها</b>\n📅 تاریخ: <b>${reportDate}</b>\n\n`;
  if (!entries.length) text += "در این روز استریم ثبت‌شده‌ای وجود نداشت.\n";
  else for (const item of entries) {
    text += `👤 <b>${escapeHtml(item.name)}</b>\n🎥 تعداد استریم: <b>${item.streams}</b>\n⏱ زمان ثبت‌شده: <b>${formatDuration(item.minutes)}</b>\n`;
    if (item.lastStreamAt) text += `🕐 آخرین ثبت: <b>${new Date(item.lastStreamAt).toLocaleString("en-GB", { timeZone: "Asia/Tehran" })}</b>\n`;
    text += "\n";
  }
  text += `━━━━━━━━━━━━\n👥 استریمرهای فعال: <b>${entries.length}</b>\n🎥 مجموع استریم‌ها: <b>${totalStreams}</b>\n⏱ مجموع زمان استریم: <b>${formatDuration(totalMinutes)}</b>`;
  const result = await telegram(env, "sendMessage", { chat_id: OWNER_ID, text, parse_mode: "HTML", disable_web_page_preview: true });
  if (result?.ok) await env.BOT_STATE.put(sentKey, "1", { expirationTtl: 60 * 60 * 24 * 45 });
}

async function startTeamTrial(env, userId, days = 30, groupChatId = "") {
  const durationDays = Math.max(1, Math.min(3650, Math.floor(Number(days) || 30)));
  const startedAt = Date.now();
  const until = startedAt + durationDays * 24 * 60 * 60 * 1000;
  const stats = await getTeamStats(env, userId);
  stats.status = "Trial";
  stats.trialStartedAt = startedAt;
  stats.trialDays = durationDays;
  stats.trialUntil = until;
  await saveTeamStats(env, userId, stats);
  await addTeamAdminLog(env, "trial_start", userId, { trialStartedAt: startedAt, trialUntil: until, trialDays: durationDays, groupChatId: String(groupChatId || "") });
  const startText = new Date(startedAt).toLocaleDateString("en-GB");
  const endText = new Date(until).toLocaleDateString("en-GB");
  const profile = await getTelegramProfile(env, userId);
  const name = getPublicUserName(profile, userId);
  await telegram(env, "sendMessage", { chat_id: userId, text: `🟡 <b>دوره تست استریم (Trial) شما شروع شد</b>\n\n👤 ${escapeHtml(name)}\n📅 تاریخ شروع: <b>${startText}</b>\n📅 تاریخ پایان: <b>${endText}</b>\n⏳ مدت دوره: <b>${durationDays} روز</b>\n\nلطفاً در این مدت فعالیت و کیفیت استریم را حفظ کنید.`, parse_mode: "HTML" });
  let groupSent = false;
  if (groupChatId) {
    const result = await telegram(env, "sendMessage", { chat_id: groupChatId, text: `🟡 <b>دوره تست استریم (Trial) شروع شد</b>\n\n👤 استریمر: <b>${escapeHtml(name)}</b>\n📅 تاریخ شروع: <b>${startText}</b>\n📅 تاریخ پایان: <b>${endText}</b>\n⏳ مدت دوره: <b>${durationDays} روز</b>`, parse_mode: "HTML" });
    groupSent = Boolean(result?.ok);
    if (!groupSent) await telegram(env, "sendMessage", { chat_id: OWNER_ID, text: `⚠️ Trial برای ${name} ثبت شد، اما ارسال پیام به گروه انتخاب‌شده ناموفق بود. دسترسی ارسال پیام بات در گروه را بررسی کن.` });
  }
  return { until, groupSent };
}
async function stopTeamTrial(env, userId) {
  const stats = await getTeamStats(env, userId);
  stats.status = "Active";
  stats.trialUntil = 0;
  stats.trialStartedAt = 0;
  stats.trialDays = 0;
  await saveTeamStats(env, userId, stats);
  await addTeamAdminLog(env, "trial_stop", userId);
}

async function processExpiredTrials(env) {
  const users = await getTeamUsers(env);
  for (const id of users) {
    const stats = await getTeamStats(env, id);
    if (stats.status === "Trial" && Number(stats.trialUntil || 0) > 0 && Number(stats.trialUntil) <= Date.now()) {
      stats.status = "Inactive";
      stats.trialUntil = 0;
      await saveTeamStats(env, id, stats);
      const members = await getStreamTimeMembers(env);
      if (members.includes(Number(id))) await saveStreamTimeMembers(env, members.filter(x => Number(x) !== Number(id)));
      await telegram(env, "sendMessage", { chat_id: id, text: "⏳ دوره Trial شما به پایان رسید. برای ادامه فعالیت، با مسئول تیم هماهنگ کنید." });
    }
  }
}

// Extract the Telegram account responsible for an update, including profile details.
function getUpdateActor(update) {
  const candidates = [
    update?.message?.from,
    update?.edited_message?.from,
    update?.callback_query?.from,
    update?.inline_query?.from,
    update?.chosen_inline_result?.from,
    update?.my_chat_member?.from,
    update?.chat_member?.from,
    update?.business_message?.from,
    update?.edited_business_message?.from
  ];
  for (const actor of candidates) {
    const id = Number(actor?.id);
    if (Number.isSafeInteger(id) && id > 0) return { ...actor, id };
  }
  return null;
}

// Fixed-window guard: 40 updates per user per 60 seconds.
// Exceeding the limit creates a 10-day lock and notifies the owner once.
// Cloudflare KV is eventually consistent/non-atomic, so this is an abuse guard,
// not a strict distributed rate limiter.
async function checkUserRateLimit(env, actor, update) {
  if (!env.BOT_STATE) return true;
  const userId = Number(actor.id);
  const now = Date.now();
  const lockKey = `security:lock:${userId}`;
  const lock = await env.BOT_STATE.get(lockKey, "json");
  if (lock && Number(lock.until) > now) return false;
  if (lock) await env.BOT_STATE.delete(lockKey);

  const windowId = Math.floor(now / 60000);
  const rateKey = `security:rate:${userId}:${windowId}`;
  const current = Number(await env.BOT_STATE.get(rateKey)) || 0;
  if (current >= 40) {
    const until = now + 10 * 24 * 60 * 60 * 1000;
    const details = {
      userId,
      username: actor.username || "ندارد",
      firstName: actor.first_name || "ندارد",
      lastName: actor.last_name || "",
      triggeredAt: now,
      until,
      reason: "بیش از ۴۰ درخواست در ۶۰ ثانیه"
    };
    await env.BOT_STATE.put(lockKey, JSON.stringify(details), { expirationTtl: 10 * 24 * 60 * 60 });
    const submittedData = update?.message?.text || update?.message?.caption || update?.callback_query?.data || update?.inline_query?.query || "متن قابل‌نمایش ندارد";
    const updateTypes = Object.keys(update || {}).filter(key => key !== "update_id").join(", ") || "نامشخص";
    try {
      await telegram(env, "sendMessage", {
        chat_id: OWNER_ID,
        text: `🚨 هشدار امنیتی بات

یک کاربر به‌دلیل عبور از محدودیت درخواست، به مدت ۱۰ روز مسدود شد. پیام‌های او در مدت مسدودی پردازش یا برای شما ارسال نمی‌شوند.

🆔 شناسه: ${userId}
👤 نام: ${details.firstName} ${details.lastName}
🔗 یوزرنیم: ${details.username === "ندارد" ? "ندارد" : "@" + details.username}
🕒 زمان: ${new Date(now).toISOString()}
⏳ پایان مسدودی: ${new Date(until).toISOString()}
📦 نوع آپدیت: ${updateTypes}
📝 آخرین متن/داده: ${String(submittedData).slice(0, 500)}`
      });
    } catch (_) {
      // A failed alert must not crash the Worker.
    }
    return false;
  }
  await env.BOT_STATE.put(rateKey, String(current + 1), { expirationTtl: 120 });
  return true;
}

async function telegram(
  env,
  method,
  data
) {
  const response =
    await fetch(
      `https://api.telegram.org/bot${env.BOT_TOKEN}/${method}`,
      {
        method:
          "POST",
        headers: {
          "Content-Type":
            "application/json"
        },
        body:
          JSON.stringify(
            data
          )
      }
    );
  return response.json();
}
