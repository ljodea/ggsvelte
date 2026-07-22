library(ggplot2)

angle <- seq(0, 2 * pi, length.out = 25)
rows <- data.frame(x = cos(angle), y = sin(angle))

plot <- ggplot(rows, aes(x, y)) +
  geom_path(linewidth = 1.1, colour = "#4385be") +
  geom_point(size = 2, colour = "#262626") +
  coord_fixed(ratio = 1) +
  labs(
    title = "Equal units stay circular",
    subtitle = "ggplot2 coord_fixed reference",
    x = "x",
    y = "y"
  ) +
  theme_minimal(base_size = 12)

ggsave(
  "artifacts/scale-equivalence/pr8-coord-fixed/ggplot2-reference.png",
  plot,
  width = 10,
  height = 7,
  dpi = 144,
  bg = "white"
)
