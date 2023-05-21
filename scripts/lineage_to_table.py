#!/usr/bin/env python3
"""Convert a taxonomic lineage string mapping into a taxon-by-rank table.

Usage:
    python me.py lineage.map > taxonomy.tsv

Notes:

A taxonomic lineage string is a hierarchical representation of an organism's
classification. For example:

    d__Bacteria; p__Proteobacteria; c__Gammaproteobacteria;
    o__Enterobacterales; f__Enterobacteriaceae; g__Escherichia;
    s__Escherichia coli

Typically, up to 8 standard taxonomic rank codes are supported:

    d (domain) or k (kingdom), p (phylum), c (class), o (order), f (family),
    g (genus), s (species), t (strain, optional)

This format is adopted by multiple programs, such as QIIME 2, GTDB-tk, and
MetaPhlAn.
"""

import sys
import fileinput


codes = {'d': 'domain',
         'k': 'kingdom',
         'p': 'phylum',
         'c': 'class',
         'o': 'order',
         'f': 'family',
         'g': 'genus',
         's': 'species',
         't': 'strain'}


def main():
    if sys.stdin.isatty() and len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)

    data, ranks, n = [], [], 0
    for line in fileinput.input():
        line = line.rstrip('\r\n')
        try:
            ctg, lineage = line.split('\t')
        except ValueError:
            raise ValueError(f'Invalid contig-to-lineage match: {line}.')
        taxa = [x.strip() for x in lineage.split(';')]
        datum = [ctg]
        for taxon in taxa:
            if taxon[1:3] != '__':
                raise ValueError(f'Invalid taxon: {taxon}.')
            code = taxon[0]
            if code not in codes:
                raise ValueError(f'Invalid rank code: {code}.')
            datum.append(taxon[3:])
        data.append(datum)
        if len(taxa) == n:
            continue
        for i, taxon in enumerate(taxa):
            code = taxon[0]
            if i < n:
                if code != ranks[i]:
                    raise ValueError(f'Inconsistent rank code {code} '
                                     f'found in {line}.')
            else:
                ranks.append(code)
                n += 1
    print('ID', '\t'.join([codes[x] for x in ranks]), sep='\t')
    for datum in data:
        if len(datum) < n:
            datum.extend([''] * (n - len(datum)))
        print('\t'.join(datum))


if __name__ == "__main__":
    main()
