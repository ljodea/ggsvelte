library(ggplot2)

rows <- data.frame(
  hour = c(0, 3, 6, 9, 12, 15, 18, 21),
  pm25 = c(8, 14, 24, 39, 62, 48, 31, 17)
)

plot <- ggplot(rows, aes(hour, pm25, colour = pm25)) +
  geom_point(size = 4) +
  scale_colour_stepsn(
    breaks = c(0, 12, 35, 55, 100),
    colours = c("#2a9d8f", "#e9c46a", "#f4a261", "#e76f51")
  ) +
  guides(colour = guide_coloursteps(direction = "horizontal")) +
  labs(
    title = "Particle pollution by hour",
    subtitle = "ggplot2 bottom colorsteps reference",
    x = "Hour",
    y = "PM2.5 (µg/m³)",
    colour = "PM2.5 band"
  ) +
  theme_minimal(base_size = 12) +
  theme(legend.position = "bottom")

ggsave(
  "artifacts/scale-equivalence/pr7-responsive-guides/ggplot2-reference.png",
  plot,
  width = 10,
  height = 7,
  dpi = 144,
  bg = "white"
)
