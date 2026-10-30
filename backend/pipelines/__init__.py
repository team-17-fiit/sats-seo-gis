"""ETL pipeline SATS-SEO-GIS: raw -> staging -> canonical -> marts.

Každý krok je samostatný modul spustiteľný cez ``python -m pipelines.<krok>``
(ADR-0005). Poradie drží Makefile (``make data``).
"""
