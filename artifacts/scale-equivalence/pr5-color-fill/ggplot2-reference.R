library(ggplot2)

readings <- data.frame(
  hour = c(0, 6, 12, 18, 22),
  pm25 = c(4, 18, 42, 76, 11)
)

png("artifacts/scale-equivalence/pr5-color-fill/ggplot2-reference.png",
    width = 1200, height = 750, res = 150)
print(
  ggplot(readings, aes(hour, pm25, colour = pm25)) +
    geom_point(size = 5) +
    scale_colour_stepsn(
      colours = c("#2a9d8f", "#e9c46a", "#f4a261", "#e76f51"),
      breaks = c(0, 12, 35, 55, 100),
      limits = c(0, 100),
      name = "PM2.5 band"
    ) +
    labs(
      title = "Particle pollution by hour",
      x = "Hour",
      y = "PM2.5 (µg/m³)"
    ) +
    theme_minimal(base_size = 12)
)
dev.off()
