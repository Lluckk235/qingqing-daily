# Supabase 隐私迁移

1. 在 Supabase 的 Table Editor 导出 `user_data` 与 `checkins` 备份。
2. 在 Authentication > Providers 启用 **Anonymous Sign-Ins**。
3. 部署本次前端更新后，只用你原来的浏览器打开网站一次。
4. 在浏览器开发者工具 Console 输入 `Supabase.userId`，复制返回的 UUID。
5. 打开 `migrations/20260811_private_workspace.sql`，将 `owner_id` 的全零 UUID 替换为该值，然后在 Supabase SQL Editor 执行。
6. 部署 Edge Function：`supabase functions deploy video-metadata --no-verify-jwt`。

迁移完成后，朋友访问相同网址仍可看每日公开资讯，但不能读取或覆盖你的个人记录。匿名身份保存在浏览器中；请在健身页面绑定恢复邮箱，再清除浏览器数据或更换设备。
