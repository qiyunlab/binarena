# Scripts

This directory hosts multiple Python 3 scripts for analysis and formatting outside the BinaRena main program.


## CheckM file conversion

Step 1. Prepare the entire set of contigs (unbinned) in a Fasta file `input/contigs.fna`.

Step 2. Determine which target taxon should be analyzed. For example, domain Bacteria (which is quite general) is used in the following example. (A list of available taxa can be found using `checkm taxon_list`.)

Step 3. Run CheckM [taxonomic-specific workflow](https://github.com/Ecogenomics/CheckM/wiki/Workflows#taxonomic-specific-workflow) as recommended:

```bash
checkm taxon_set domain Bacteria Bacteria.ms
checkm analyze Bacteria.ms input output
checkm qa Bacteria.ms checkm
```

Step 4. Convert the CheckM output into a contig-to-markers map using [checkm_markers_map.py](checkm_markers_map.py):

```bash
python checkm_markers_map.py output/storage/marker_gene_stats.tsv > Bacteria.map
```

The output file `Bacteria.map` can be imported into BinaRena as a "feature set" field.

Step 5. Convert a CheckM marker set definition into a marker list using [checkm_marker_list.py](checkm_marker_list.py):

```bash
python checkm_marker_list.py Bacteria.ms > Bacteria.lst
```

The output file `Bacteria.lst` can be imported into BinaRena as a feature group membership list.

Step 6. Then one can use the "feature group" menu item to calculate **completeness** and **redundancy** (contamination) scores of selection contigs in real time!

**Note**: The output values are analogous to CheckM's completeness and redundancy scores, and they can be intepreted in a similar way. However there is one difference: CheckM considers the **collocation** of marker genes when calculating these metrics. BinaRena does not, however, as of the current version, and the output values are based on a plain list of features.
