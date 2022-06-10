#!/usr/bin/env python3
"""Calculate length, GC% and coverage (if applicable) of DNA sequences.

Examples:
    python me.py -i input.fna -o output.tsv
    python me.py -i final.contigs.fa -a megahit -o output.tsv
    python me.py -i scaffolds.fasta -a spades --trim -o output.tsv
    zcat input.fna.gz | python me.py -l 1000 | gzip > output.tsv.gz

Notes:
    Length and GC content are calculated from the actual sequences. Code
    degeneracy is considered when counting GC.

    Coverage is taken from assembler-specific sequence titles (if applicable).
    However, note that these are not precise coverage values, and they are
    likely not identical to the results calculated from read mappings.
"""

import re
import sys
import argparse


# SPAdes sequence title
# e.g. NODE_1_length_1000_cov_12.3
spades = re.compile(r'^(NODE_\d+)_length_(\d+)_cov_(\d*\.?\d*)$')

# MEGAHIT sequence title
# e.g. k141_1 flag=1 multi=5.0000 len=1000
megahit = re.compile(r'^(k\d+_\d+)\sflag=\d+\smulti=(\d*\.?\d*)\slen=(\d+)$')


def parse_args():
    """Command-line interface.
    """
    parser = argparse.ArgumentParser(
        formatter_class=argparse.RawDescriptionHelpFormatter)
    arg = parser.add_argument
    arg('-i', '--input', type=argparse.FileType('r'), default=sys.stdin,
        help='input multi-FASTA file, default: stdin')
    arg('-l', '--minlen', type=int,
        help='minimum length threshold')
    arg('-a', '--assembler', type=str, default='auto',
        choices=['auto', 'spades', 'megahit', 'none'],
        help='parse assembler-specific titles')
    arg('-t', '--trim', action='store_true',
        help='trim SPAdes titles into NODE_#')
    arg('-o', '--output', type=argparse.FileType('w'), default=sys.stdout,
        help='output table file, default: stdout')
    for arg in parser._actions:
        arg.metavar = ''
    if len(sys.argv) == 1:
        print(__doc__)
        parser.print_help()
        sys.exit(1)
    return parser.parse_args()


def main():
    args = parse_args()
    out = args.output
    minlen = args.minlen
    assem = args.assembler
    trim = args.trim
    head = False
    title = None
    seq = ''

    def parse_seq():
        if not seq:
            return
        L = len(seq)
        if minlen and L < minlen:
            return
        gc = '{:.2f}'.format(count_gc(seq) * 100 / L)
        nonlocal title
        nonlocal head
        try:
            name, cov = parse_title(title, assem, trim)
        except ValueError as e:
            exit(e)
        if cov:
            if not head:
                print('ID', 'length', 'GC', 'coverage', sep='\t', file=out)
                head = True
            print(name, L, gc, cov, sep='\t', file=out)
        else:
            if not head:
                print('ID', 'length', 'GC', sep='\t', file=out)
                head = True
            print(name, L, gc, sep='\t', file=out)

    for line in args.input:
        line = line.rstrip()
        if line.startswith('>'):
            parse_seq()
            title, seq = line[1:], ''
        else:
            seq += line.upper()
    parse_seq()


def count_gc(seq):
    """Calculate frequency of G and C in a DNA sequence.

    Parameters
    ----------
    seq : str
        DNA sequence.

    Returns
    -------
    float
        GC frequency.

    Notes
    ----
    Code degeneracy is considered.
    """
    res = 0
    for c in seq.upper():
        if c in 'GCS':
            res += 6
        elif c in 'RYKMN':
            res += 3
        elif c in 'DH':
            res += 2
        elif c in 'BV':
            res += 4
    return res / 6


def parse_title(title, assem, trim=False):
    """Extract information from a sequence title.

    Parameters
    ----------
    title : str
        Sequence title.
    assem : str
        Assembler name.
    trim : bool, optional
        Whether trim SPAdes metrics.

    Returns
    -------
    str
        Sequence name.
    str
        Sequence coverage (if applicable).

    Raises
    ------
    ValueError
        If title format does not match designated assembler.
    """
    name, cov = None, None
    if assem == 'none':
        name = title.split()[0]
    elif assem == 'spades':
        m = spades.match(title)
        if m:
            name = m.group(1) if trim else title
            cov = m.group(3)
        else:
            raise ValueError(
                f'{title} is not a valid SPAdes sequence title.')
    elif assem == 'megahit':
        m = megahit.match(title)
        if m:
            name = m.group(1)
            cov = m.group(2)
        else:
            raise ValueError(
                f'{title} is not a valid MEGAHIT sequence title.')
    elif assem == 'auto':
        m = spades.match(title)
        if m:
            name = m.group(1) if trim else title
            cov = m.group(3)
        else:
            m = megahit.match(title)
            if m:
                name = m.group(1)
                cov = m.group(2)
            else:
                name = title.split()[0]
    return name, cov


if __name__ == "__main__":
    main()
