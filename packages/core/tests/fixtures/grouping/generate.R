#!/usr/bin/env Rscript
# M0a-5 grouping-parity fixture generator.
# Extracts ggplot2's effective GROUP assignment (ggplot2:::add_group semantics,
# observed through the public layer_data()/ggplot_build() API) for a fixed
# synthetic dataset, and writes one JSON fixture per case into this directory.
#
# Group ids are canonicalized by first occurrence in row order so fixtures are
# stable against ggplot2's internal id ordering (which follows factor-level /
# alphabetical order, not row order).
#
# Run from anywhere:  Rscript spikes/pure/fixtures/grouping/generate.R

suppressPackageStartupMessages({
  library(ggplot2)
  library(jsonlite)
})

out_dir <- dirname(sub("--file=", "", grep("--file=", commandArgs(FALSE), value = TRUE)[1]))
if (is.na(out_dir) || out_dir == "") out_dir <- "."

# ---------------------------------------------------------------- dataset ---
# First-occurrence order deliberately differs from alphabetical order
# (cat1: b,a,c; cat2: y,x) so canonicalization is actually exercised.
df <- data.frame(
  cat1  = rep(c("b", "a", "c"), 4),
  cat2  = rep(c("y", "x"), 6),
  num1  = 1:12,
  num2  = c(5.1, 3.2, 8.7, 1.4, 9.9, 2.6, 7.3, 4.8, 6.5, 0.2, 8.1, 3.9),
  date1 = as.Date("2026-01-01") + 7 * (0:11),
  stringsAsFactors = FALSE
)

write_json(
  list(
    columns = list(cat1 = "string", cat2 = "string", num1 = "number",
                   num2 = "number", date1 = "date"),
    rows = df |> transform(date1 = format(date1, "%Y-%m-%d"))
  ),
  file.path(out_dir, "data.json"),
  dataframe = "rows", auto_unbox = TRUE, pretty = TRUE, digits = NA
)

# ---------------------------------------------------------------- helpers ---

# Renumber group ids by first occurrence: c(5,5,2,9,2) -> c(0,0,1,2,1).
# ggplot2's NO_GROUP (-1, all rows one group) canonicalizes to all-zero.
canonicalize <- function(g) match(g, unique(g)) - 1L

# Per-input-row group assignment for a mapping. Group derivation in ggplot2
# is geom/stat-independent (it runs in the layer's compute_aesthetics step),
# so an identity-stat point layer observes it without post-stat row collapse.
row_groups <- function(mapping) {
  p <- ggplot(df, mapping) + geom_point()
  layer_data(p)$group
}

emit <- function(id, name, description, ggplot_call, aes_json, expected, extra = list()) {
  fixture <- c(
    list(
      case = sprintf("%02d-%s", id, name),
      description = description,
      provenance = "R-generated",
      ggplot2Version = as.character(packageVersion("ggplot2")),
      rVersion = paste(R.version$major, R.version$minor, sep = "."),
      ggplotCall = ggplot_call,
      aes = aes_json,
      expected = expected
    ),
    extra
  )
  path <- file.path(out_dir, sprintf("%02d-%s.json", id, name))
  write_json(fixture, path, auto_unbox = TRUE, pretty = TRUE, digits = NA)
  cat("wrote", path, "\n")
}

expected_from_raw <- function(raw) {
  canon <- canonicalize(raw)
  list(
    rawGgplotGroups = raw,
    canonicalGroups = canon,
    groupCount = length(unique(canon))
  )
}

field <- function(f) list(field = f)

# ------------------------------------------------------------------ cases ---

# 1. no discrete aes -> single group (ggplot2 NO_GROUP = -1)
raw <- row_groups(aes(x = num1, y = num2))
emit(1, "no-discrete-single-group",
     "No discrete aesthetic in the mapping: every row gets ggplot2's NO_GROUP (-1), i.e. one implicit group.",
     "ggplot(df, aes(x = num1, y = num2)) + geom_point()",
     list(x = field("num1"), y = field("num2")),
     expected_from_raw(raw))

# 2. discrete x -> groups by cat1
raw <- row_groups(aes(x = cat1, y = num1))
emit(2, "discrete-x-groups",
     "Discrete x (character column): groups follow cat1 levels.",
     "ggplot(df, aes(x = cat1, y = num1)) + geom_point()",
     list(x = field("cat1"), y = field("num1")),
     expected_from_raw(raw))

# 3. discrete color -> groups by cat1
raw <- row_groups(aes(x = num1, y = num2, color = cat1))
emit(3, "discrete-color-groups",
     "Discrete color on continuous positions: groups follow cat1.",
     "ggplot(df, aes(x = num1, y = num2, color = cat1)) + geom_point()",
     list(x = field("num1"), y = field("num2"), color = field("cat1")),
     expected_from_raw(raw))

# 4. two discrete aes -> interaction cat1 x cat2
raw <- row_groups(aes(x = num1, y = num2, color = cat1, linetype = cat2))
emit(4, "interaction-of-discrete",
     "Two discrete aesthetics: effective group is the interaction cat1 x cat2 (6 groups).",
     "ggplot(df, aes(x = num1, y = num2, color = cat1, linetype = cat2)) + geom_path()",
     list(x = field("num1"), y = field("num2"), color = field("cat1"), linetype = field("cat2")),
     expected_from_raw(raw))

# 5. explicit group override wins over discrete x
raw <- row_groups(aes(x = cat1, y = num1, group = cat2))
emit(5, "explicit-group-override",
     "Explicit aes(group = cat2) wins: discrete x (cat1) is ignored for grouping.",
     "ggplot(df, aes(x = cat1, y = num1, group = cat2)) + geom_point()",
     list(x = field("cat1"), y = field("num1"), group = field("cat2")),
     expected_from_raw(raw))

# 6. constant group -> single group
raw <- row_groups(aes(x = num1, y = num2, group = 1))
emit(6, "constant-group",
     "aes(group = 1): constant explicit group forces a single group.",
     "ggplot(df, aes(x = num1, y = num2, group = 1)) + geom_line()",
     list(x = field("num1"), y = field("num2"), group = list(value = 1)),
     expected_from_raw(raw))

# 7. geom_line with color=cat1 -> number of drawn lines == group count
mapping7 <- aes(x = num1, y = num2, color = cat1)
raw <- row_groups(mapping7)
p7 <- ggplot(df, mapping7) + geom_line()
built7 <- layer_data(p7)
emit(7, "line-splits-by-group",
     "geom_line splits into one polyline per group: line count must equal group count.",
     "ggplot(df, aes(x = num1, y = num2, color = cat1)) + geom_line()",
     list(x = field("num1"), y = field("num2"), color = field("cat1")),
     expected_from_raw(raw),
     extra = list(expectedLineCount = length(unique(built7$group))))

# 8. stacked bars: aes(x=cat1, fill=cat2) + geom_bar()
mapping8 <- aes(x = cat1, fill = cat2)
raw <- row_groups(aes(x = cat1, y = num1, fill = cat2)) # same discrete interaction; point needs y
p8 <- ggplot(df, mapping8) + geom_bar()
built8 <- layer_data(p8)
built8_canon <- canonicalize(built8$group)
stack_per_x <- as.integer(table(built8$x))
emit(8, "bar-stack",
     "geom_bar stacking with x=cat1, fill=cat2: pre-stat groups are the full cat1 x cat2 interaction; stat_count yields one bar segment per group; segments stack per x.",
     "ggplot(df, aes(x = cat1, fill = cat2)) + geom_bar()",
     list(x = field("cat1"), fill = field("cat2")),
     expected_from_raw(raw),
     extra = list(
       builtBars = data.frame(
         xLevel = levels(factor(df$cat1))[built8$x],
         fill = built8$fill,
         count = built8$count,
         canonicalGroup = built8_canon,
         ymin = built8$ymin,
         ymax = built8$ymax
       ),
       stackSegmentsPerX = stack_per_x
     ))

# 9. dodged bars: same mapping + position_dodge
p9 <- ggplot(df, mapping8) + geom_bar(position = "dodge")
built9 <- layer_data(p9)
built9_canon <- canonicalize(built9$group)
# position_dodge moves x off the integer category centers (1 +/- offset);
# recover the category index by rounding.
built9_xcat <- as.integer(round(built9$x))
dodge_slots_per_x <- as.integer(table(built9_xcat))
emit(9, "bar-dodge",
     "Same mapping with position_dodge: identical group derivation; bars separate horizontally, one dodge slot per group present at each x.",
     "ggplot(df, aes(x = cat1, fill = cat2)) + geom_bar(position = \"dodge\")",
     list(x = field("cat1"), fill = field("cat2")),
     expected_from_raw(raw),
     extra = list(
       builtBars = data.frame(
         xLevel = levels(factor(df$cat1))[built9_xcat],
         fill = built9$fill,
         count = built9$count,
         canonicalGroup = built9_canon,
         xmin = built9$xmin,
         xmax = built9$xmax
       ),
       dodgeSlotsPerX = dodge_slots_per_x
     ))

# 10. numeric column mapped to color -> continuous -> NO grouping
raw <- row_groups(aes(x = num1, y = num2, color = num2))
emit(10, "continuous-color-no-groups",
     "A numeric column on color is a continuous scale: it must NOT create groups (NO_GROUP -1).",
     "ggplot(df, aes(x = num1, y = num2, color = num2)) + geom_point()",
     list(x = field("num1"), y = field("num2"), color = field("num2")),
     expected_from_raw(raw))

# 11. Date on x -> continuous -> NO grouping (documents date-discreteness rule)
raw <- row_groups(aes(x = date1, y = num1))
emit(11, "date-x-continuous-no-groups",
     "Date column on x is continuous in ggplot2: it must NOT create groups.",
     "ggplot(df, aes(x = date1, y = num1)) + geom_point()",
     list(x = field("date1"), y = field("num1")),
     expected_from_raw(raw))

cat("done: ggplot2", as.character(packageVersion("ggplot2")), "\n")
