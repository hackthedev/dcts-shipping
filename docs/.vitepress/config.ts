import { defineConfig } from 'vitepress'
import { generateSidebar } from 'vitepress-sidebar'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "Official DCTS Documentation",
  description: "This is the official DCTS documentation page",
  ignoreDeadLinks: [
    /localhost/
  ],
  cleanUrls: true,
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Documents', link: '/Getting started' }
    ],

    sidebar: generateSidebar({
      documentRootPath: '/docs',
      useTitleFromFileHeading: true,
      useFolderTitleFromIndexFile: true,
      collapsed: false,
      capitalizeFirst: true,
      sortFolderTo: 'bottom',
      excludeFolders: ['.obsidian', '.vitepress']
    }),

    socialLinks: [
      { icon: 'github', link: 'https://github.com/hackthedev/dcts-shipping/' },
      { icon: 'reddit', link: 'https://reddit.com/r/dcts/' },
      { icon: 'discord', link: 'https://discord.com/invite/AYq8hbRHNR' },
      { icon: 'kofi', link: 'https://ko-fi.com/shydevil' },
    ]
  }
})
