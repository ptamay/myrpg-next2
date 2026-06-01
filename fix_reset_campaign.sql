CREATE OR REPLACE FUNCTION reset_campaign()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NOT public.is_gm() THEN
    RAISE EXCEPTION 'Não autorizado';
  END IF;

  DELETE FROM mural_connections;
  DELETE FROM mural_cards;
  DELETE FROM murals;
  DELETE FROM diary_entries;
  DELETE FROM maps;
  DELETE FROM supplies;
  DELETE FROM journey_blocks;
  DELETE FROM journey_days;
  DELETE FROM players;
  DELETE FROM npcs;
  DELETE FROM campaign;

  -- Recria estado base
  INSERT INTO public.campaign (name, current_day, active_block_index)
  VALUES ('Campanha Inicial', 1, 0);

  INSERT INTO public.journey_days (day_number, date_in_game)
  VALUES (1, CURRENT_DATE);
END;
$$;
