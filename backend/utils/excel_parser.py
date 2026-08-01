import pandas as pd
import os
import re


def is_allowed_file(filename, allowed_extensions):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in allowed_extensions


def read_excel_preview(filepath, sample_size=5):
    """
    Read Excel file and return column info + sample data
    User will use this to select columns
    """
    ext = os.path.splitext(filepath)[1].lower()
    
    try:
        if ext == ".csv":
            df = pd.read_csv(filepath, dtype=str)
        elif ext in [".xlsx", ".xls"]:
            df = pd.read_excel(filepath, dtype=str)
        else:
            raise Exception("Unsupported file format")
        
        # Clean dataframe
        df = df.fillna("")
        df.columns = [str(c).strip() for c in df.columns]
        
        # Get column info
        columns = []
        for col in df.columns:
            # Get sample values (non-empty)
            samples = df[col].dropna().astype(str).str.strip()
            samples = samples[samples != ""].head(sample_size).tolist()
            
            columns.append({
                "name": col,
                "samples": samples,
            })
        
        # Get preview rows
        preview_rows = []
        for idx, row in df.head(sample_size).iterrows():
            row_data = {}
            for col in df.columns:
                row_data[col] = str(row[col]).strip()
            preview_rows.append(row_data)
        
        return {
            "columns": columns,
            "column_names": list(df.columns),
            "preview_rows": preview_rows,
            "total_rows": len(df),
        }
        
    except Exception as e:
        raise Exception(f"Failed to read file: {str(e)}")


def parse_excel_with_columns(filepath, qr_column, id_column=None):
    """
    Parse Excel using user-selected columns
    
    Args:
        filepath: Path to Excel file
        qr_column: Column name containing QR data (URL/text)
        id_column: Column name for filename ID (optional)
    """
    ext = os.path.splitext(filepath)[1].lower()
    
    try:
        if ext == ".csv":
            df = pd.read_csv(filepath, dtype=str)
        elif ext in [".xlsx", ".xls"]:
            df = pd.read_excel(filepath, dtype=str)
        else:
            raise Exception("Unsupported file format")
        
        df = df.fillna("")
        df.columns = [str(c).strip() for c in df.columns]
        
        # Validate columns exist
        if qr_column not in df.columns:
            raise Exception(f"Column '{qr_column}' not found in file")
        
        if id_column and id_column not in df.columns:
            raise Exception(f"Column '{id_column}' not found in file")
        
        # Build result list
        results = []
        for idx, row in df.iterrows():
            content = str(row[qr_column]).strip()
            
            if not content:
                continue
            
            # Get unique ID
            if id_column:
                raw_id = str(row[id_column]).strip()
                if raw_id:
                    # Clean ID for filename (remove special chars)
                    unique_id = re.sub(r'[^\w\-]', '_', raw_id)[:60]
                else:
                    unique_id = f"AUTO{idx + 1}"
            else:
                unique_id = f"AUTO{idx + 1}"
            
            results.append({
                "content": content,
                "unique_id": unique_id,
                "row_number": idx + 2,  # +2 for header
            })
        
        return {
            "data": results,
            "qr_column": qr_column,
            "id_column": id_column,
            "total_rows": len(df),
            "valid_rows": len(results),
        }
        
    except Exception as e:
        raise Exception(f"Failed to parse file: {str(e)}")