library(ggplot2)

rows <- data.frame(
  x = c(1, 2, 3, 1, 2, 3),
  y = c(2.1, 3.4, 4.2, 1.3, 2.2, 3.1),
  group = c("North", "North", "North", "South", "South", "South"),
  magnitude = c(12, 28, 45, 20, 36, 52),
  confidence = c(0.45, 0.62, 0.86, 0.55, 0.76, 0.95),
  weight = c(1, 1, 1, 4, 4, 4)
)

plot <- ggplot(rows, aes(x, y)) +
  geom_line(aes(group = group, linewidth = weight, linetype = group), alpha = 0.7) +
  geom_point(aes(size = magnitude, alpha = confidence, shape = group)) +
  scale_size_continuous(range = c(3, 10)) +
  scale_alpha_continuous(range = c(0.35, 1)) +
  scale_linewidth_continuous(range = c(1, 5)) +
  scale_shape_manual(values = c(North = 16, South = 17)) +
  scale_linetype_manual(values = c(North = "solid", South = "dashed")) +
  labs(
    title = "Complete mapped style scales",
    subtitle = "ggplot2 semantic reference",
    x = "Observation",
    y = "Value"
  ) +
  theme_minimal(base_size = 12)

ggsave(
  "artifacts/scale-equivalence/pr6-style-aesthetics/ggplot2-reference.png",
  plot,
  width = 10,
  height = 7,
  dpi = 144,
  bg = "white"
)
