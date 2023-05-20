# Scripts

This directory hosts multiple Python scripts for analyses and formatting outside the BinaRena main program. They are useful for preparing the input files for BinaRena. Each script has a command-line interface when you execute them.

- [`sequence_basics.py`](sequence_basics.py): Obtains basic information of contig sequences.
- [`orf_to_contig.py`](orf_to_contig.py): Converts an ORF-to-feature mapping into a contig-to-feature(s) mapping.
- [`gff_to_features.py`](gff_to_features.py): Extracts feature attributes from a GFF annotation file.
- [`count_kmers.py`](count_kmers.py): Calculates _k_-mer frequencies of contig sequences.
- [`reduce_dimension.py`](reduce_dimension.py): Performs dimensionality reduction of contig properties.
- [`lineage_to_table.py`](lineage_to_table.py): Converts taxonomic lineage strings into a table of taxonomic ranks.
- [`kraken_to_table.py`](kraken_to_table.py): Converts a Kraken classification report into a table of taxonomic ranks.
- [`checkm_marker_map.py`](checkm_marker_map.py): Converts CheckM output into a contig-to-markers map.
- [`checkm_marker_list.py`](checkm_marker_list.py): Converts CheckM marker set definition into a marker list.

Read the BinaRena documentation on the [usage and applications of these scripts](https://github.com/qiyunlab/binarena/wiki/Scripts).
