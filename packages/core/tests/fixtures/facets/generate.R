#!/usr/bin/env Rscript
# M2 facet + coord-flip parity fixture generator (same pattern as
# fixtures/stats/generate.R). Extracts ggplot2's PER-PANEL stat output via
# layer_data() (the PANEL column) for facet_wrap over the count and bin
# stats — fixed AND free_x scales — plus the coord_flip axis contract from
# ggplot_build()'s panel_params (which axis shows which scale, and the
# category order along the flipped axis).
#
# Run from anywhere:  Rscript packages/core/tests/fixtures/facets/generate.R

suppressPackageStartupMessages({
  library(ggplot2)
  library(jsonlite)
})

out_dir <- dirname(sub("--file=", "", grep("--file=", commandArgs(FALSE), value = TRUE)[1]))
if (is.na(out_dir) || out_dir == "") out_dir <- "."

emit <- function(id, name, description, ggplot_call, data, expected, extra = NULL) {
  fixture <- c(
    list(
      case = sprintf("%02d-%s", id, name),
      description = description,
      provenance = "R-generated",
      ggplot2Version = as.character(packageVersion("ggplot2")),
      rVersion = paste(R.version$major, R.version$minor, sep = "."),
      ggplotCall = ggplot_call,
      data = data,
      expected = expected
    ),
    extra
  )
  path <- file.path(out_dir, sprintf("%02d-%s.json", id, name))
  write_json(fixture, path, auto_unbox = TRUE, pretty = TRUE, digits = NA)
  cat("wrote", path, "\n")
}

df_json <- function(df) as.list(df)

# --------------------------------------------------------------- datasets ---

set.seed(9021)
# Categorical counting data across three facet panels; panel sizes differ
# and one category is absent from one panel (partition correctness).
n <- 90
df_count <- data.frame(
  cat = sample(c("a", "b", "c"), n, replace = TRUE, prob = c(0.5, 0.3, 0.2)),
  g = rep(c("p1", "p2", "p3"), each = 30),
  stringsAsFactors = FALSE
)
df_count$cat[df_count$g == "p3" & df_count$cat == "c"] <- "a"

# Continuous binning data with per-panel ranges that DIFFER (so shared vs
# free break grids produce measurably different bins).
x1 <- round(rnorm(40, 0, 1), 6)
x2 <- round(rnorm(40, 5, 2), 6)
df_bin <- data.frame(
  v = c(x1, x2),
  g = rep(c("p1", "p2"), each = 40),
  stringsAsFactors = FALSE
)

# ------------------------------------------------ 01: facet_wrap + count ---

p1 <- ggplot(df_count, aes(cat)) +
  geom_bar() +
  facet_wrap(~g)
ld1 <- layer_data(p1)
emit(
  1, "wrap-count",
  "facet_wrap(~g) + geom_bar(): per-panel counts through layer_data(). PANEL is 1-based in panel order (g sorted ascending); x is the band index over the SHARED discrete domain.",
  "ggplot(df, aes(cat)) + geom_bar() + facet_wrap(~g)",
  df_json(df_count),
  list(
    panel = as.integer(ld1$PANEL),
    xLabel = levels(factor(df_count$cat))[as.integer(ld1$x)], # category labels
    count = ld1$count
  )
)

# ------------------------------------------- 02: facet_wrap + bin (fixed) ---

p2 <- ggplot(df_bin, aes(v)) +
  geom_histogram(bins = 10) +
  facet_wrap(~g)
ld2 <- layer_data(p2)
emit(
  2, "wrap-bin-fixed",
  "facet_wrap(~g) + geom_histogram(bins = 10), FIXED scales: ggplot2 computes ONE break grid from the shared x scale across panels; every panel emits the same xmin/xmax edges.",
  "ggplot(df, aes(v)) + geom_histogram(bins = 10) + facet_wrap(~g)",
  df_json(df_bin),
  list(
    panel = as.integer(ld2$PANEL),
    xmin = ld2$xmin,
    xmax = ld2$xmax,
    count = ld2$count
  )
)

# ------------------------------------------ 03: facet_wrap + bin (free_x) ---

p3 <- ggplot(df_bin, aes(v)) +
  geom_histogram(bins = 10) +
  facet_wrap(~g, scales = "free_x")
ld3 <- layer_data(p3)
emit(
  3, "wrap-bin-free-x",
  "facet_wrap(~g, scales = 'free_x') + geom_histogram(bins = 10): each panel derives its OWN break grid from its own data range.",
  "ggplot(df, aes(v)) + geom_histogram(bins = 10) + facet_wrap(~g, scales = 'free_x')",
  df_json(df_bin),
  list(
    panel = as.integer(ld3$PANEL),
    xmin = ld3$xmin,
    xmax = ld3$xmax,
    count = ld3$count
  )
)

# ---------------------------------------------------- 04: coord_flip bars ---

p4 <- ggplot(df_count, aes(cat)) +
  geom_bar() +
  coord_flip()
b4 <- ggplot_build(p4)
pp <- b4$layout$panel_params[[1]]
ld4 <- layer_data(p4)
emit(
  4, "coord-flip-bar",
  "geom_bar() + coord_flip(): layer_data is IDENTICAL to the unflipped plot (coord is display-only); the built panel's y axis carries the discrete categories bottom-to-top and the x axis carries the count range.",
  "ggplot(df, aes(cat)) + geom_bar() + coord_flip()",
  df_json(df_count),
  list(
    xLabel = levels(factor(df_count$cat))[as.integer(ld4$x)],
    count = ld4$count,
    # After coord_flip the DISCRETE scale renders on y: labels in axis order
    # (bottom to top) and the continuous count range renders on x.
    yAxisLabels = as.character(pp$y$get_labels()),
    xRange = pp$x.range
  )
)
