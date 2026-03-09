import pandas as pd
import os
import sys

# Force output to utf-8 for terminal logging
if sys.stdout.encoding != 'utf-8':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

excel_path = r'C:\JWW\automation_addin\xuat\OHD wo.xlsm'
if os.path.exists(excel_path):
    try:
        # Load sheets
        df_thamso = pd.read_excel(excel_path, sheet_name='THAM_SO', engine='openpyxl')
        
        # Function to find range
        def get_range(ma_yc, purpose):
            val = df_thamso.loc[(df_thamso['MA_YC'] == ma_yc) & (df_thamso['Purpose'] == purpose), 'VALUE'].tolist()
            return val[0] if val else None

        range_41 = get_range('HARI', '4.1_CONG_DOAN_1')
        print(f"Range for 4.1: {range_41}")
        
        if range_41:
            # Read sheet1 for the data
            addr_start, addr_end = range_41.split(':')
            df_full = pd.read_excel(excel_path, sheet_name='Sheet1', engine='openpyxl', header=None)
            
            def addr_to_idx(addr):
                import re
                match = re.match(r"([A-Z]+)([0-9]+)", addr)
                col_str, row_str = match.groups()
                col = 0
                for char in col_str:
                    col = col * 26 + (ord(char) - ord('A') + 1)
                return int(row_str) - 1, col - 1

            r1, c1 = addr_to_idx(addr_start)
            r2, c2 = addr_to_idx(addr_end)
            
            df_slice = df_full.iloc[r1-1:r2+1, c1:c2+1] # Give some slack for header
            # Find the header row (contains 'TITLE')
            header_row_idx = 0
            for i in range(len(df_slice)):
                if 'TITLE' in [str(x).upper() for x in df_slice.iloc[i].tolist()]:
                    header_row_idx = i
                    break
            
            df_slice.columns = df_slice.iloc[header_row_idx]
            df_slice = df_slice[header_row_idx+1:].reset_index(drop=True)
            
            print("--- 4.1_CONG_DOAN_1 Config ---")
            print(df_slice.to_string())
            
            # Also check Layer mapping
            range_layer = get_range('SET_CONFIG', 'LAYER')
            if range_layer:
                r1, c1 = addr_to_idx(range_layer.split(':')[0])
                r2, c2 = addr_to_idx(range_layer.split(':')[1])
                df_layers_full = df_full.iloc[r1-1:r2+1, c1:c2+1].copy()
                header_row_idx = 0
                for i in range(len(df_layers_full)):
                    if 'FILE' in [str(x).upper() for x in df_layers_full.iloc[i].tolist()]:
                        header_row_idx = i
                        break
                df_layers_full.columns = df_layers_full.iloc[header_row_idx]
                df_layers = df_layers_full[header_row_idx+1:].reset_index(drop=True)
                print("\n--- LAYER Mapping ---")
                print(df_layers.to_string())

    except Exception as e:
        import traceback
        print(f"Error: {e}")
        traceback.print_exc()
else:
    print("Excel file not found")
